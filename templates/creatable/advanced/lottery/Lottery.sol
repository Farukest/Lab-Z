// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, euint8, ebool, eaddress, externalEuint64, externalEuint8, externalEbool, externalEaddress } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Lottery - Provably Fair Encrypted Lottery
/// @notice A lottery where the winner selection is encrypted and cannot be manipulated
/// @dev Uses FHE.random() for truly fair winner selection with async public decryption
contract Lottery is ZamaEthereumConfig {

    // ============ Errors ============

    /// @dev Lottery has already been drawn
    error LotteryAlreadyDrawn();
    /// @dev Lottery has not been drawn yet
    error LotteryNotDrawn();
    /// @dev Winner not yet revealed
    error WinnerNotRevealed();
    /// @dev Not enough participants
    error NotEnoughParticipants();
    /// @dev Caller is not the winner
    error NotWinner();
    /// @dev Prize already claimed
    error PrizeAlreadyClaimed();
    /// @dev Insufficient payment for ticket
    error InsufficientPayment();
    /// @dev Already entered the lottery
    error AlreadyEntered();
    /// @dev Invalid decryption proof
    error InvalidDecryptionProof();


    // ============ Events ============

    /// @notice Emitted when someone enters the lottery
    event LotteryEntered(address indexed participant, uint256 participantIndex);
    /// @notice Emitted when the winner is drawn (encrypted)
    event WinnerDrawn(uint256 totalParticipants);
    /// @notice Emitted when winner index is ready for decryption
    event WinnerReadyForReveal();
    /// @notice Emitted when the winner is revealed
    event WinnerRevealed(uint256 winnerIndex, address winner);
    /// @notice Emitted when the prize is claimed
    event PrizeClaimed(address indexed winner, uint256 amount);


    // ============ State Variables ============

    /// @dev List of lottery participants
    address[] private _participants;

    /// @dev Mapping to check if address has entered
    mapping(address => bool) private _hasEntered;

    /// @dev Ticket price in wei
    uint256 private _ticketPrice;

    /// @dev Encrypted winner index
    euint64 private _encryptedWinnerIndex;

    /// @dev Decrypted winner index (set after reveal)
    uint256 private _revealedWinnerIndex;

    /// @dev Whether the lottery has been drawn
    bool private _isDrawn;

    /// @dev Whether the winner has been revealed
    bool private _isRevealed;

    /// @dev Whether the prize has been claimed
    bool private _isClaimed;

    /// @dev Lottery end time
    uint256 private _endTime;



    // ============ Modifiers ============

    /// @dev Ensures lottery is still open
    modifier onlyBeforeDraw() {
        if (_isDrawn) revert LotteryAlreadyDrawn();
        if (block.timestamp > _endTime) revert LotteryAlreadyDrawn();
        _;
    }

    /// @dev Ensures lottery has been drawn
    modifier onlyAfterDraw() {
        if (!_isDrawn) revert LotteryNotDrawn();
        _;
    }

    /// @dev Ensures winner has been revealed
    modifier onlyAfterReveal() {
        if (!_isRevealed) revert WinnerNotRevealed();
        _;
    }



    // ============ Constructor ============

    /// @param ticketPriceWei The price per ticket in wei
    /// @param durationSeconds How long the lottery runs
    constructor(
        uint256 ticketPriceWei,
        uint256 durationSeconds
    ) {
        _ticketPrice = ticketPriceWei;
        _endTime = block.timestamp + durationSeconds;

    }

    // ============ External Functions ============

    /// @notice Enter the lottery by paying the ticket price
    function enter() external payable onlyBeforeDraw  {


        if (msg.value < _ticketPrice) revert InsufficientPayment();
        if (_hasEntered[msg.sender]) revert AlreadyEntered();

        // Add participant
        _participants.push(msg.sender);
        _hasEntered[msg.sender] = true;



        emit LotteryEntered(msg.sender, _participants.length - 1);
    }

    /// @notice Draw the winner using encrypted randomness
    /// @dev Uses FHE.random() and FHE.rem() for fair selection
    function draw() external onlyBeforeDraw  {


        if (_participants.length < 2) revert NotEnoughParticipants();

        // Generate encrypted random number
        euint64 randomValue = FHE.randEuint64();

        // Calculate winner index: random % participantCount
        uint64 participantCount = uint64(_participants.length);
        _encryptedWinnerIndex = FHE.rem(randomValue, participantCount);

        // Set ACL - contract can use this value
        FHE.allowThis(_encryptedWinnerIndex);

        _isDrawn = true;



        emit WinnerDrawn(_participants.length);
    }

    /// @notice Request the winner index to be publicly decryptable
    /// @dev Step 1 of public decryption - marks ciphertext for off-chain decryption
    function requestWinnerReveal() external onlyAfterDraw {
        require(!_isRevealed, "Already revealed");

        // Mark the encrypted winner index as publicly decryptable
        FHE.makePubliclyDecryptable(_encryptedWinnerIndex);

        emit WinnerReadyForReveal();
    }

    /// @notice Finalize winner reveal with decryption proof
    /// @dev Step 3 of public decryption - verifies and stores the decrypted winner
    /// @param winnerIndex The decrypted winner index from off-chain
    /// @param decryptionProof The proof from Zama KMS validating the decryption
    function finalizeWinnerReveal(
        uint256 winnerIndex,
        bytes calldata decryptionProof
    ) external onlyAfterDraw {
        require(!_isRevealed, "Already revealed");
        require(winnerIndex < _participants.length, "Invalid index");

        // Verify the decryption proof
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(_encryptedWinnerIndex);

        bytes memory cleartexts = abi.encode(winnerIndex);

        // This reverts if proof is invalid
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Store the revealed winner
        _revealedWinnerIndex = winnerIndex;
        _isRevealed = true;

        emit WinnerRevealed(winnerIndex, _participants[winnerIndex]);
    }

    /// @notice Claim the prize if you are the winner
    function claimPrize() external onlyAfterReveal {
        if (_isClaimed) revert PrizeAlreadyClaimed();

        // Check if caller is the winner
        if (_participants[_revealedWinnerIndex] != msg.sender) {
            revert NotWinner();
        }

        _isClaimed = true;

        // Transfer prize
        uint256 prize = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: prize}("");
        require(success, "Transfer failed");

        emit PrizeClaimed(msg.sender, prize);
    }

    /// @notice Get the encrypted winner index handle (for off-chain decryption)
    /// @return The encrypted winner index
    function getEncryptedWinnerIndex() external view onlyAfterDraw returns (euint64) {
        return _encryptedWinnerIndex;
    }



    // ============ View Functions ============

    /// @notice Get the number of participants
    function getParticipantCount() external view returns (uint256) {
        return _participants.length;
    }

    /// @notice Get the ticket price
    function getTicketPrice() external view returns (uint256) {
        return _ticketPrice;
    }

    /// @notice Get the current prize pool
    function getPrizePool() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get the lottery end time
    function getEndTime() external view returns (uint256) {
        return _endTime;
    }

    /// @notice Check if lottery has been drawn
    function isDrawn() external view returns (bool) {
        return _isDrawn;
    }

    /// @notice Check if winner has been revealed
    function isRevealed() external view returns (bool) {
        return _isRevealed;
    }

    /// @notice Check if prize has been claimed
    function isClaimed() external view returns (bool) {
        return _isClaimed;
    }

    /// @notice Get the revealed winner address (only after reveal)
    function getWinner() external view onlyAfterReveal returns (address) {
        return _participants[_revealedWinnerIndex];
    }

    /// @notice Get the revealed winner index (only after reveal)
    function getWinnerIndex() external view onlyAfterReveal returns (uint256) {
        return _revealedWinnerIndex;
    }

    /// @notice Check if an address has entered
    function hasEntered(address participant) external view returns (bool) {
        return _hasEntered[participant];
    }

    /// @notice Get participant at index
    function getParticipant(uint256 index) external view returns (address) {
        require(index < _participants.length, "Index out of bounds");
        return _participants[index];
    }



    // ============ Internal Functions ============


}
