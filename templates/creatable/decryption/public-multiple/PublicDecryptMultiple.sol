// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, euint32, externalEuint64, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Public Decrypt Multiple Values - Batch 3-Step Async Public Decryption
/// @notice Demonstrates how to publicly decrypt multiple encrypted values at once
/// @dev This pattern extends the single-value 3-step flow to handle multiple values
///
/// ╔═══════════════════════════════════════════════════════════════════════════╗
/// ║           BATCH 3-STEP ASYNC PUBLIC DECRYPTION PATTERN                     ║
/// ╠═══════════════════════════════════════════════════════════════════════════╣
/// ║                                                                            ║
/// ║  STEP 1 - On-chain: Request Reveal for ALL values                         ║
/// ║  ───────────────────────────────────────────────────────────────           ║
/// ║  FHE.makePubliclyDecryptable(value1);                                      ║
/// ║  FHE.makePubliclyDecryptable(value2);                                      ║
/// ║  FHE.makePubliclyDecryptable(value3);                                      ║
/// ║                                                                            ║
/// ║  STEP 2 - Off-chain: Batch decrypt via Relayer SDK                         ║
/// ║  ───────────────────────────────────────────────────────────────           ║
/// ║  const handles = await contract.getAllHandles();                           ║
/// ║  const result = await fhevm.publicDecrypt(handles);                        ║
/// ║  // result.clearValues contains all decrypted values                       ║
/// ║                                                                            ║
/// ║  STEP 3 - On-chain: Finalize with single proof for ALL values              ║
/// ║  ───────────────────────────────────────────────────────────────           ║
/// ║  FHE.checkSignatures(cts, cleartexts, proof);                              ║
/// ║  // One proof verifies all values!                                         ║
/// ║                                                                            ║
/// ╚═══════════════════════════════════════════════════════════════════════════╝
///
/// Use Cases:
/// - Lottery: Reveal multiple winning numbers
/// - Auction: Reveal all bid amounts
/// - Election: Reveal vote counts for all candidates
/// - Game: Reveal final scores for all players
///
/// ╔═══════════════════════════════════════════════════════════════════════════╗
/// ║              CRUCIAL ORDERING CONSTRAINT                                   ║
/// ╠═══════════════════════════════════════════════════════════════════════════╣
/// ║                                                                            ║
/// ║  The decryption proof is cryptographically bound to the specific order     ║
/// ║  of handles passed in the input array.                                     ║
/// ║                                                                            ║
/// ║  The proof computed for [efoo, ebar] is DIFFERENT from [ebar, efoo]!       ║
/// ║                                                                            ║
/// ║  cts[0] = handle1, cts[1] = handle2                                        ║
/// ║  cleartexts = abi.encode(value1, value2)  <- CORRECT (same order)          ║
/// ║  cleartexts = abi.encode(value2, value1)  <- WRONG (order mismatch)        ║
/// ║                                                                            ║
/// ╚═══════════════════════════════════════════════════════════════════════════╝
contract PublicDecryptMultiple is ZamaEthereumConfig {
    // ============ Errors ============
    error ValuesNotSet();
    error RevealNotRequested();
    error AlreadyRevealed();
    error InvalidProof();

    // ============ Events ============
    event ValuesSet(address indexed setter, uint256 count);
    event RevealRequested(address indexed requester);
    event ValuesRevealed(uint64 value1, uint64 value2, uint64 value3);

    // ============ State ============
    // Three encrypted values for batch reveal
    euint64 private _encValue1;
    euint64 private _encValue2;
    euint64 private _encValue3;

    // State tracking
    bool public valuesSet;
    bool public revealRequested;
    bool public revealed;

    // Revealed (public) values
    uint64 public revealedValue1;
    uint64 public revealedValue2;
    uint64 public revealedValue3;

    // ============ Lottery Example State ============
    euint32 private _encWinningNumber1;
    euint32 private _encWinningNumber2;
    euint32 private _encWinningNumber3;
    euint32 private _encBonusNumber;

    bool public lotterySet;
    bool public lotteryRevealRequested;
    bool public lotteryRevealed;

    uint32 public winningNumber1;
    uint32 public winningNumber2;
    uint32 public winningNumber3;
    uint32 public bonusNumber;

    // ============ Step 0: Store Multiple Encrypted Values ============

    /// @notice Store 3 encrypted values for later batch reveal
    /// @param encInput1 First encrypted value
    /// @param encInput2 Second encrypted value
    /// @param encInput3 Third encrypted value
    /// @param inputProof Zero-knowledge proof for all inputs
    function setValues(
        externalEuint64 encInput1,
        externalEuint64 encInput2,
        externalEuint64 encInput3,
        bytes calldata inputProof
    ) external {
        _encValue1 = FHE.fromExternal(encInput1, inputProof);
        _encValue2 = FHE.fromExternal(encInput2, inputProof);
        _encValue3 = FHE.fromExternal(encInput3, inputProof);

        // Allow contract to use all values
        FHE.allowThis(_encValue1);
        FHE.allowThis(_encValue2);
        FHE.allowThis(_encValue3);

        valuesSet = true;
        revealRequested = false;
        revealed = false;

        emit ValuesSet(msg.sender, 3);
    }

    // ============ Step 1: Request Batch Reveal ============

    /// @notice STEP 1: Request public decryption of ALL values at once
    /// @dev Marks all encrypted values for public decryption
    function requestRevealAll() external {
        if (!valuesSet) revert ValuesNotSet();
        if (revealRequested) revert AlreadyRevealed();

        // Mark ALL values for public decryption
        FHE.makePubliclyDecryptable(_encValue1);
        FHE.makePubliclyDecryptable(_encValue2);
        FHE.makePubliclyDecryptable(_encValue3);

        revealRequested = true;

        emit RevealRequested(msg.sender);
    }

    /// @notice Get all encrypted handles for off-chain batch decryption
    /// @dev STEP 2 starts here - use these handles with relayer-sdk
    ///
    /// Off-chain code:
    /// ```typescript
    /// const [h1, h2, h3] = await contract.getAllHandles();
    /// const result = await fhevm.publicDecrypt([h1, h2, h3]);
    /// const clear1 = result.clearValues[h1];
    /// const clear2 = result.clearValues[h2];
    /// const clear3 = result.clearValues[h3];
    /// const proof = result.decryptionProof;
    /// ```
    function getAllHandles() external view returns (
        euint64 handle1,
        euint64 handle2,
        euint64 handle3
    ) {
        return (_encValue1, _encValue2, _encValue3);
    }

    // ============ Step 3: Finalize Batch Reveal ============

    /// @notice STEP 3: Finalize batch reveal with single proof
    /// @dev One proof verifies ALL decrypted values
    /// @param clearValue1 First decrypted value
    /// @param clearValue2 Second decrypted value
    /// @param clearValue3 Third decrypted value
    /// @param decryptionProof Single proof for all values from KMS
    function finalizeRevealAll(
        uint64 clearValue1,
        uint64 clearValue2,
        uint64 clearValue3,
        bytes calldata decryptionProof
    ) external {
        if (!revealRequested) revert RevealNotRequested();
        if (revealed) revert AlreadyRevealed();

        // Build ciphertext array with ALL handles
        // IMPORTANT: Order must EXACTLY match cleartexts order below!
        bytes32[] memory cts = new bytes32[](3);
        cts[0] = euint64.unwrap(_encValue1);
        cts[1] = euint64.unwrap(_encValue2);
        cts[2] = euint64.unwrap(_encValue3);

        // Build cleartext bytes - order must match cts[] array!
        bytes memory cleartexts = abi.encode(clearValue1, clearValue2, clearValue3);

        // One proof verifies ALL values
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Store all revealed values
        revealed = true;
        revealedValue1 = clearValue1;
        revealedValue2 = clearValue2;
        revealedValue3 = clearValue3;

        emit ValuesRevealed(clearValue1, clearValue2, clearValue3);
    }

    // ============ Lottery Example ============

    /// @notice Set 4 lottery numbers (encrypted)
    function setLotteryNumbers(
        externalEuint32 num1,
        externalEuint32 num2,
        externalEuint32 num3,
        externalEuint32 bonus,
        bytes calldata inputProof
    ) external {
        _encWinningNumber1 = FHE.fromExternal(num1, inputProof);
        _encWinningNumber2 = FHE.fromExternal(num2, inputProof);
        _encWinningNumber3 = FHE.fromExternal(num3, inputProof);
        _encBonusNumber = FHE.fromExternal(bonus, inputProof);

        FHE.allowThis(_encWinningNumber1);
        FHE.allowThis(_encWinningNumber2);
        FHE.allowThis(_encWinningNumber3);
        FHE.allowThis(_encBonusNumber);

        lotterySet = true;
        lotteryRevealRequested = false;
        lotteryRevealed = false;

        emit ValuesSet(msg.sender, 4);
    }

    /// @notice Request reveal of all lottery numbers
    function requestLotteryReveal() external {
        if (!lotterySet) revert ValuesNotSet();
        if (lotteryRevealRequested) revert AlreadyRevealed();

        FHE.makePubliclyDecryptable(_encWinningNumber1);
        FHE.makePubliclyDecryptable(_encWinningNumber2);
        FHE.makePubliclyDecryptable(_encWinningNumber3);
        FHE.makePubliclyDecryptable(_encBonusNumber);

        lotteryRevealRequested = true;

        emit RevealRequested(msg.sender);
    }

    /// @notice Get all lottery handles
    function getLotteryHandles() external view returns (
        euint32 num1,
        euint32 num2,
        euint32 num3,
        euint32 bonus
    ) {
        return (_encWinningNumber1, _encWinningNumber2, _encWinningNumber3, _encBonusNumber);
    }

    /// @notice Finalize lottery reveal
    function finalizeLotteryReveal(
        uint32 num1,
        uint32 num2,
        uint32 num3,
        uint32 bonus,
        bytes calldata decryptionProof
    ) external {
        if (!lotteryRevealRequested) revert RevealNotRequested();
        if (lotteryRevealed) revert AlreadyRevealed();

        // Order must match abi.encode() below!
        bytes32[] memory cts = new bytes32[](4);
        cts[0] = euint32.unwrap(_encWinningNumber1);
        cts[1] = euint32.unwrap(_encWinningNumber2);
        cts[2] = euint32.unwrap(_encWinningNumber3);
        cts[3] = euint32.unwrap(_encBonusNumber);

        bytes memory cleartexts = abi.encode(num1, num2, num3, bonus);

        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        lotteryRevealed = true;
        winningNumber1 = num1;
        winningNumber2 = num2;
        winningNumber3 = num3;
        bonusNumber = bonus;
    }

    // ============ View Functions ============

    /// @notice Get all revealed values
    function getAllRevealedValues() external view returns (
        uint64 value1,
        uint64 value2,
        uint64 value3
    ) {
        require(revealed, "Not yet revealed");
        return (revealedValue1, revealedValue2, revealedValue3);
    }

    /// @notice Get lottery results
    function getLotteryResults() external view returns (
        uint32 num1,
        uint32 num2,
        uint32 num3,
        uint32 bonus
    ) {
        require(lotteryRevealed, "Not yet revealed");
        return (winningNumber1, winningNumber2, winningNumber3, bonusNumber);
    }

    /// @notice Get current state
    function getState() external view returns (
        bool _valuesSet,
        bool _revealRequested,
        bool _revealed
    ) {
        return (valuesSet, revealRequested, revealed);
    }
}
