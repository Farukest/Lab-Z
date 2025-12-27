// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Public Decrypt Single Value - 3-Step Async Public Decryption
/// @notice Demonstrates the complete public decryption flow in FHEVM
/// @dev This is the CURRENT pattern - the old Gateway/Oracle callback is REMOVED
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║            3-STEP ASYNC PUBLIC DECRYPTION PATTERN                  ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  STEP 1 - On-chain: Request Reveal                                ║
/// ║  ─────────────────────────────────────────────────────────────     ║
/// ║  Call: FHE.makePubliclyDecryptable(encryptedValue)                ║
/// ║  This marks the value for public decryption                        ║
/// ║                                                                    ║
/// ║  STEP 2 - Off-chain: Decrypt via Relayer SDK                       ║
/// ║  ─────────────────────────────────────────────────────────────     ║
/// ║  const handle = await contract.getValueHandle();                   ║
/// ║  const result = await fhevm.publicDecrypt([handle]);               ║
/// ║  const clearValue = result.clearValues[handle];                    ║
/// ║  const proof = result.decryptionProof;                             ║
/// ║                                                                    ║
/// ║  STEP 3 - On-chain: Finalize with Proof                           ║
/// ║  ─────────────────────────────────────────────────────────────     ║
/// ║  Call: FHE.checkSignatures(cts, cleartexts, proof)                ║
/// ║  This verifies the KMS proof and stores the decrypted value        ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
///
/// PUBLIC vs PRIVATE DECRYPTION:
/// - PUBLIC: Everyone can see the decrypted value (on-chain after finalize)
/// - PRIVATE: Only authorized user sees value (off-chain only)
contract PublicDecryptSingle is ZamaEthereumConfig {
    // ============ Errors ============
    error ValueNotSet();
    error RevealNotRequested();
    error AlreadyRevealed();
    error InvalidDecryptionProof();

    // ============ Events ============
    event ValueSet(address indexed setter);
    event RevealRequested(address indexed requester);
    event ValueRevealed(uint64 revealedValue);

    // ============ State ============
    euint64 private _encryptedValue;
    bool public valueSet;
    bool public revealRequested;
    bool public revealed;
    uint64 public revealedValue;

    // ============ Step 0: Store Encrypted Value ============

    /// @notice Store an encrypted value for later public reveal
    /// @param encryptedInput The encrypted value from client
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function setValue(
        externalEuint64 encryptedInput,
        bytes calldata inputProof
    ) external {
        _encryptedValue = FHE.fromExternal(encryptedInput, inputProof);

        // Allow contract to use this value
        FHE.allowThis(_encryptedValue);

        valueSet = true;
        revealRequested = false;
        revealed = false;
        revealedValue = 0;

        emit ValueSet(msg.sender);
    }

    // ============ Step 1: Request Public Reveal ============

    /// @notice STEP 1: Request public decryption of the value
    /// @dev Marks the encrypted value for public decryption
    ///
    /// After this call:
    /// - The value is marked for public decryption
    /// - Off-chain services can now decrypt it
    /// - The decrypted value is NOT yet on-chain
    function requestReveal() external {
        if (!valueSet) revert ValueNotSet();
        if (revealRequested) revert AlreadyRevealed();

        // CRITICAL: Mark for public decryption
        // This is the key function that enables public reveal
        FHE.makePubliclyDecryptable(_encryptedValue);

        revealRequested = true;

        emit RevealRequested(msg.sender);
    }

    /// @notice Get the encrypted value handle for off-chain decryption
    /// @dev STEP 2 starts here - use this handle with relayer-sdk
    ///
    /// Off-chain code:
    /// ```typescript
    /// const handle = await contract.getValueHandle();
    /// const result = await fhevm.publicDecrypt([handle]);
    /// const clearValue = result.clearValues[handle];
    /// const proof = result.decryptionProof;
    /// ```
    function getValueHandle() external view returns (euint64) {
        return _encryptedValue;
    }

    // ============ Step 3: Finalize with Proof ============

    /// @notice STEP 3: Finalize reveal with decryption proof from KMS
    /// @dev Verifies the proof and stores the decrypted value
    /// @param clearValue The decrypted value from off-chain
    /// @param decryptionProof The proof from Zama KMS
    ///
    /// This function:
    /// 1. Verifies the proof is valid
    /// 2. Stores the decrypted value on-chain
    /// 3. Emits event with the revealed value
    ///
    /// Off-chain code continues:
    /// ```typescript
    /// await contract.finalizeReveal(clearValue, proof);
    /// // Now everyone can see the value!
    /// const publicValue = await contract.revealedValue();
    /// ```
    function finalizeReveal(
        uint64 clearValue,
        bytes calldata decryptionProof
    ) external {
        if (!revealRequested) revert RevealNotRequested();
        if (revealed) revert AlreadyRevealed();

        // Build ciphertext array for verification
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(_encryptedValue);

        // Build cleartext bytes for verification
        bytes memory cleartexts = abi.encode(clearValue);

        // CRITICAL: Verify the decryption proof
        // This reverts if the proof is invalid
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Store the revealed value
        revealed = true;
        revealedValue = clearValue;

        emit ValueRevealed(clearValue);
    }

    // ============ View Functions ============

    /// @notice Get the publicly revealed value
    /// @dev Only valid after finalizeReveal() is called
    function getRevealedValue() external view returns (uint64) {
        require(revealed, "Not yet revealed");
        return revealedValue;
    }

    /// @notice Get current state of the reveal process
    function getState() external view returns (
        bool _valueSet,
        bool _revealRequested,
        bool _revealed,
        uint64 _revealedValue
    ) {
        return (valueSet, revealRequested, revealed, revealedValue);
    }
}
