// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, euint32, externalEuint64, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Batch Reveal System - Advanced Multi-Party Reveal with Threshold
/// @notice Demonstrates a sophisticated batch reveal system with multiple entries
/// @dev Advanced pattern for revealing multiple encrypted entries with:
///      - Dynamic entry storage
///      - Batch reveal with single proof
///      - Threshold-based reveal triggers
///      - Entry management and state tracking
///
/// Use Cases:
/// - Sealed-Bid Auction: Reveal all bids at once
/// - Tournament: Reveal all scores simultaneously
/// - Lottery: Reveal multiple winning numbers
/// - Voting: Reveal all vote counts atomically
/// - Payroll: Batch reveal salary payments
///
/// KEY PATTERN: Store N encrypted values, reveal all with ONE proof
///
/// Flow:
/// 1. Organizer creates a batch session
/// 2. Participants submit encrypted entries
/// 3. Organizer closes entries and requests reveal
/// 4. Off-chain: Batch decrypt all entries
/// 5. Finalize with single proof - all entries revealed atomically
contract BatchReveal is ZamaEthereumConfig {
    // ============ Constants ============
    uint256 public constant MAX_ENTRIES = 20;

    // ============ Errors ============
    error SessionNotActive();
    error SessionClosed();
    error MaxEntriesReached();
    error NoEntries();
    error RevealNotRequested();
    error AlreadyRevealed();
    error OnlyOrganizer();
    error InvalidEntryCount();
    error ArrayLengthMismatch();

    // ============ Events ============
    event SessionCreated(uint256 indexed sessionId, address indexed organizer, string description);
    event EntrySubmitted(uint256 indexed sessionId, address indexed participant, uint256 entryIndex);
    event EntriesClosed(uint256 indexed sessionId, uint256 entryCount);
    event RevealRequested(uint256 indexed sessionId);
    event BatchRevealed(uint256 indexed sessionId, uint256 entryCount);

    // ============ Structs ============
    struct Entry {
        address participant;
        euint64 encryptedValue;
        uint64 revealedValue;
        bool revealed;
    }

    struct Session {
        address organizer;
        string description;
        bool entriesOpen;
        bool revealRequested;
        bool revealed;
        uint256 entryCount;
        mapping(uint256 => Entry) entries;
    }

    // ============ State ============
    uint256 public sessionCounter;
    mapping(uint256 => Session) private _sessions;

    // ============ Modifiers ============
    modifier onlyOrganizer(uint256 sessionId) {
        if (msg.sender != _sessions[sessionId].organizer) revert OnlyOrganizer();
        _;
    }

    // ============ Session Management ============

    /// @notice Create a new batch reveal session
    /// @param description Description of the session (e.g., "Q4 Bonus Reveal")
    /// @return sessionId The ID of the created session
    function createSession(string calldata description) external returns (uint256 sessionId) {
        sessionId = sessionCounter++;

        Session storage session = _sessions[sessionId];
        session.organizer = msg.sender;
        session.description = description;
        session.entriesOpen = true;
        session.revealRequested = false;
        session.revealed = false;
        session.entryCount = 0;

        emit SessionCreated(sessionId, msg.sender, description);
    }

    // ============ Entry Submission ============

    /// @notice Submit an encrypted entry to a session
    /// @dev Participant submits their encrypted value
    /// @param sessionId The session to submit to
    /// @param encryptedValue The encrypted entry value
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function submitEntry(
        uint256 sessionId,
        externalEuint64 encryptedValue,
        bytes calldata inputProof
    ) external {
        Session storage session = _sessions[sessionId];

        if (!session.entriesOpen) revert SessionClosed();
        if (session.entryCount >= MAX_ENTRIES) revert MaxEntriesReached();

        euint64 value = FHE.fromExternal(encryptedValue, inputProof);

        // Store entry
        uint256 entryIndex = session.entryCount;
        session.entries[entryIndex] = Entry({
            participant: msg.sender,
            encryptedValue: value,
            revealedValue: 0,
            revealed: false
        });
        session.entryCount++;

        // Allow contract to use the value
        FHE.allowThis(value);

        emit EntrySubmitted(sessionId, msg.sender, entryIndex);
    }

    /// @notice Submit multiple entries at once (batch submission)
    /// @param sessionId The session to submit to
    /// @param encryptedValues Array of encrypted values
    /// @param inputProof Zero-knowledge proof for all inputs
    function submitBatchEntries(
        uint256 sessionId,
        externalEuint64[] calldata encryptedValues,
        bytes calldata inputProof
    ) external {
        Session storage session = _sessions[sessionId];

        if (!session.entriesOpen) revert SessionClosed();
        if (session.entryCount + encryptedValues.length > MAX_ENTRIES) revert MaxEntriesReached();

        for (uint256 i = 0; i < encryptedValues.length; i++) {
            euint64 value = FHE.fromExternal(encryptedValues[i], inputProof);

            uint256 entryIndex = session.entryCount;
            session.entries[entryIndex] = Entry({
                participant: msg.sender,
                encryptedValue: value,
                revealedValue: 0,
                revealed: false
            });
            session.entryCount++;

            FHE.allowThis(value);

            emit EntrySubmitted(sessionId, msg.sender, entryIndex);
        }
    }

    // ============ Close and Request Reveal ============

    /// @notice Close entries and request batch reveal (organizer only)
    /// @dev Marks all entries for public decryption
    /// @param sessionId The session to close and reveal
    function closeAndRequestReveal(uint256 sessionId) external onlyOrganizer(sessionId) {
        Session storage session = _sessions[sessionId];

        if (!session.entriesOpen) revert SessionClosed();
        if (session.entryCount == 0) revert NoEntries();
        if (session.revealRequested) revert AlreadyRevealed();

        // Close entries
        session.entriesOpen = false;

        // Mark ALL entries for public decryption
        for (uint256 i = 0; i < session.entryCount; i++) {
            FHE.makePubliclyDecryptable(session.entries[i].encryptedValue);
        }

        session.revealRequested = true;

        emit EntriesClosed(sessionId, session.entryCount);
        emit RevealRequested(sessionId);
    }

    // ============ Get Handles for Decryption ============

    /// @notice Get all encrypted handles for off-chain batch decryption
    /// @dev Returns array of handles to decrypt with relayer-sdk
    /// @param sessionId The session ID
    /// @return handles Array of encrypted handles
    /// @return participants Array of participant addresses (same order)
    ///
    /// Off-chain code:
    /// ```typescript
    /// const { handles, participants } = await contract.getSessionHandles(sessionId);
    /// const result = await fhevm.publicDecrypt(handles);
    /// // result.clearValues[handles[i]] = decrypted value for participants[i]
    /// const proof = result.decryptionProof;
    /// await contract.finalizeBatchReveal(sessionId, clearValues, proof);
    /// ```
    function getSessionHandles(uint256 sessionId) external view returns (
        euint64[] memory handles,
        address[] memory participants
    ) {
        Session storage session = _sessions[sessionId];
        uint256 count = session.entryCount;

        handles = new euint64[](count);
        participants = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            handles[i] = session.entries[i].encryptedValue;
            participants[i] = session.entries[i].participant;
        }
    }

    // ============ Finalize Batch Reveal ============

    /// @notice Finalize batch reveal with single proof for all entries
    /// @dev Verifies proof and stores all revealed values atomically
    /// @param sessionId The session ID
    /// @param clearValues Array of decrypted values (must match entry order)
    /// @param decryptionProof Single proof for all values from KMS
    function finalizeBatchReveal(
        uint256 sessionId,
        uint64[] calldata clearValues,
        bytes calldata decryptionProof
    ) external {
        Session storage session = _sessions[sessionId];

        if (!session.revealRequested) revert RevealNotRequested();
        if (session.revealed) revert AlreadyRevealed();
        if (clearValues.length != session.entryCount) revert ArrayLengthMismatch();

        // Build ciphertext array
        // CRITICAL: Order must match clearValues order!
        bytes32[] memory cts = new bytes32[](session.entryCount);
        for (uint256 i = 0; i < session.entryCount; i++) {
            cts[i] = euint64.unwrap(session.entries[i].encryptedValue);
        }

        // Build cleartext bytes - dynamic encoding for variable-length array
        bytes memory cleartexts = abi.encodePacked();
        for (uint256 i = 0; i < clearValues.length; i++) {
            cleartexts = abi.encodePacked(cleartexts, abi.encode(clearValues[i]));
        }

        // Verify proof for ALL values at once
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Store all revealed values
        for (uint256 i = 0; i < session.entryCount; i++) {
            session.entries[i].revealedValue = clearValues[i];
            session.entries[i].revealed = true;
        }

        session.revealed = true;

        emit BatchRevealed(sessionId, session.entryCount);
    }

    // ============ View Functions ============

    /// @notice Get session info
    function getSessionInfo(uint256 sessionId) external view returns (
        address organizer,
        string memory description,
        bool entriesOpen,
        bool revealRequested,
        bool revealed,
        uint256 entryCount
    ) {
        Session storage session = _sessions[sessionId];
        return (
            session.organizer,
            session.description,
            session.entriesOpen,
            session.revealRequested,
            session.revealed,
            session.entryCount
        );
    }

    /// @notice Get a specific entry (after reveal)
    function getEntry(uint256 sessionId, uint256 entryIndex) external view returns (
        address participant,
        uint64 value,
        bool revealed
    ) {
        Session storage session = _sessions[sessionId];
        Entry storage entry = session.entries[entryIndex];
        return (entry.participant, entry.revealedValue, entry.revealed);
    }

    /// @notice Get all revealed entries
    function getAllRevealedEntries(uint256 sessionId) external view returns (
        address[] memory participants,
        uint64[] memory values
    ) {
        Session storage session = _sessions[sessionId];
        require(session.revealed, "Not yet revealed");

        participants = new address[](session.entryCount);
        values = new uint64[](session.entryCount);

        for (uint256 i = 0; i < session.entryCount; i++) {
            participants[i] = session.entries[i].participant;
            values[i] = session.entries[i].revealedValue;
        }
    }

    /// @notice Find the winner (highest value)
    /// @dev Useful for auction/competition scenarios
    function findWinner(uint256 sessionId) external view returns (
        address winner,
        uint64 winningValue,
        uint256 winningIndex
    ) {
        Session storage session = _sessions[sessionId];
        require(session.revealed, "Not yet revealed");
        require(session.entryCount > 0, "No entries");

        winningValue = 0;

        for (uint256 i = 0; i < session.entryCount; i++) {
            if (session.entries[i].revealedValue > winningValue) {
                winner = session.entries[i].participant;
                winningValue = session.entries[i].revealedValue;
                winningIndex = i;
            }
        }
    }

    /// @notice Get entry count for a session
    function getEntryCount(uint256 sessionId) external view returns (uint256) {
        return _sessions[sessionId].entryCount;
    }

    /// @notice Check if session exists
    function sessionExists(uint256 sessionId) external view returns (bool) {
        return _sessions[sessionId].organizer != address(0);
    }
}
