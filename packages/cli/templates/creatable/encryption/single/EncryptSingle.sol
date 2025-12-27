// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, euint16, euint32, euint64, ebool, externalEuint8, externalEuint16, externalEuint32, externalEuint64, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypt Single Value - How to receive encrypted inputs
/// @notice Demonstrates FHE.fromExternal() for single value encryption
/// @dev Shows the complete flow: client encrypts -> contract receives -> stores encrypted
///
/// KEY CONCEPTS:
/// 1. Client-side: Use fhevm.createEncryptedInput().add*().encrypt()
/// 2. Contract: Receive as external* type (e.g., externalEuint64) + inputProof
/// 3. Convert: Use FHE.fromExternal(value, inputProof) to get internal encrypted type
/// 4. ACL: Set permissions with FHE.allowThis() and FHE.allow()
contract EncryptSingle is ZamaEthereumConfig {
    // ============ Encrypted Storage ============
    // Store different encrypted types
    euint8 private _storedUint8;
    euint16 private _storedUint16;
    euint32 private _storedUint32;
    euint64 private _storedUint64;
    ebool private _storedBool;

    // Track who stored what
    mapping(address => bool) public hasStoredValue;

    // ============ Events ============
    event ValueStored(address indexed user, string valueType);

    // ============ Store Encrypted Values ============

    /// @notice Store an encrypted 8-bit integer
    /// @dev Client encrypts with: fhevm.createEncryptedInput().add8(value).encrypt()
    /// @param encryptedValue The encrypted 8-bit value from client
    /// @param inputProof Zero-knowledge proof for the encrypted input
    ///
    /// Client-side example:
    /// ```typescript
    /// const input = await fhevm
    ///   .createEncryptedInput(contractAddress, userAddress)
    ///   .add8(42)  // Your secret value
    ///   .encrypt();
    /// await contract.storeUint8(input.handles[0], input.inputProof);
    /// ```
    function storeUint8(
        externalEuint8 encryptedValue,
        bytes calldata inputProof
    ) external {
        // Convert external encrypted value to internal type
        // This validates the proof and creates a usable encrypted value
        _storedUint8 = FHE.fromExternal(encryptedValue, inputProof);

        // CRITICAL: Set permissions!
        FHE.allowThis(_storedUint8);        // Contract can use this value
        FHE.allow(_storedUint8, msg.sender); // Sender can decrypt later

        hasStoredValue[msg.sender] = true;
        emit ValueStored(msg.sender, "uint8");
    }

    /// @notice Store an encrypted 16-bit integer
    /// @param encryptedValue The encrypted 16-bit value from client
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function storeUint16(
        externalEuint16 encryptedValue,
        bytes calldata inputProof
    ) external {
        _storedUint16 = FHE.fromExternal(encryptedValue, inputProof);

        FHE.allowThis(_storedUint16);
        FHE.allow(_storedUint16, msg.sender);

        hasStoredValue[msg.sender] = true;
        emit ValueStored(msg.sender, "uint16");
    }

    /// @notice Store an encrypted 32-bit integer
    /// @param encryptedValue The encrypted 32-bit value from client
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function storeUint32(
        externalEuint32 encryptedValue,
        bytes calldata inputProof
    ) external {
        _storedUint32 = FHE.fromExternal(encryptedValue, inputProof);

        FHE.allowThis(_storedUint32);
        FHE.allow(_storedUint32, msg.sender);

        hasStoredValue[msg.sender] = true;
        emit ValueStored(msg.sender, "uint32");
    }

    /// @notice Store an encrypted 64-bit integer
    /// @dev Most common type for amounts, balances, IDs
    /// @param encryptedValue The encrypted 64-bit value from client
    /// @param inputProof Zero-knowledge proof for the encrypted input
    ///
    /// Client-side example:
    /// ```typescript
    /// const input = await fhevm
    ///   .createEncryptedInput(contractAddress, userAddress)
    ///   .add64(1000000n)  // Large numbers use BigInt (n suffix)
    ///   .encrypt();
    /// await contract.storeUint64(input.handles[0], input.inputProof);
    /// ```
    function storeUint64(
        externalEuint64 encryptedValue,
        bytes calldata inputProof
    ) external {
        _storedUint64 = FHE.fromExternal(encryptedValue, inputProof);

        FHE.allowThis(_storedUint64);
        FHE.allow(_storedUint64, msg.sender);

        hasStoredValue[msg.sender] = true;
        emit ValueStored(msg.sender, "uint64");
    }

    /// @notice Store an encrypted boolean
    /// @param encryptedValue The encrypted boolean from client
    /// @param inputProof Zero-knowledge proof for the encrypted input
    ///
    /// Client-side example:
    /// ```typescript
    /// const input = await fhevm
    ///   .createEncryptedInput(contractAddress, userAddress)
    ///   .addBool(true)
    ///   .encrypt();
    /// await contract.storeBool(input.handles[0], input.inputProof);
    /// ```
    function storeBool(
        externalEbool encryptedValue,
        bytes calldata inputProof
    ) external {
        _storedBool = FHE.fromExternal(encryptedValue, inputProof);

        FHE.allowThis(_storedBool);
        FHE.allow(_storedBool, msg.sender);

        hasStoredValue[msg.sender] = true;
        emit ValueStored(msg.sender, "bool");
    }

    // ============ Plaintext to Encrypted ============
    // WARNING: These reveal the value on-chain!

    /// @notice Convert plaintext to encrypted (VISIBLE ON-CHAIN!)
    /// @dev Only use for initialization with known public values
    /// @param value The plaintext value (will be visible in transaction!)
    function storePlaintextAsEncrypted(uint64 value) external {
        // WARNING: 'value' is visible in the transaction data!
        // Anyone watching the blockchain can see this value
        // Only use for:
        // - Initial contract setup
        // - Known public constants
        // - Testing purposes
        _storedUint64 = FHE.asEuint64(value);

        FHE.allowThis(_storedUint64);
        FHE.allow(_storedUint64, msg.sender);

        hasStoredValue[msg.sender] = true;
        emit ValueStored(msg.sender, "uint64-from-plaintext");
    }

    // ============ View Functions ============

    /// @notice Get stored 8-bit value handle
    /// @dev Caller must have permission (from FHE.allow) to decrypt
    function getStoredUint8() external view returns (euint8) {
        return _storedUint8;
    }

    /// @notice Get stored 16-bit value handle
    function getStoredUint16() external view returns (euint16) {
        return _storedUint16;
    }

    /// @notice Get stored 32-bit value handle
    function getStoredUint32() external view returns (euint32) {
        return _storedUint32;
    }

    /// @notice Get stored 64-bit value handle
    function getStoredUint64() external view returns (euint64) {
        return _storedUint64;
    }

    /// @notice Get stored boolean handle
    function getStoredBool() external view returns (ebool) {
        return _storedBool;
    }
}
