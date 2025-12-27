// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Missing Allow Anti-Pattern - Forgetting FHE.allow() and FHE.allowThis()
/// @notice Demonstrates what happens when you forget to set permissions
/// @dev This is another CRITICAL mistake that causes silent failures
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    THE MISTAKE                                     ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  Developer stores an encrypted value but forgets to call:          ║
/// ║                                                                    ║
/// ║  FHE.allowThis(value)  ← Contract can't use the value later!       ║
/// ║  FHE.allow(value, user) ← User can't decrypt the value!            ║
/// ║                                                                    ║
/// ║  Result:                                                           ║
/// ║  - Contract operations fail silently or revert                     ║
/// ║  - User decryption returns wrong values or fails                   ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    WHY PERMISSIONS MATTER                          ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  FHE.allowThis(value):                                             ║
/// ║  - Grants the CONTRACT permission to use this encrypted value      ║
/// ║  - Required for: storing, computing, comparing                     ║
/// ║  - Without it: future operations on this value may fail            ║
/// ║                                                                    ║
/// ║  FHE.allow(value, address):                                        ║
/// ║  - Grants a SPECIFIC ADDRESS permission to decrypt                 ║
/// ║  - Required for: off-chain user decryption                         ║
/// ║  - Without it: userDecryptEuint() returns wrong value or fails     ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
contract MissingAllowAntiPattern is ZamaEthereumConfig {
    // ============ State ============
    euint64 private _valueWithoutAllow;
    euint64 private _valueWithAllow;
    euint64 private _computedValue;

    event ValueSet(string description);

    // ============ ANTI-PATTERN 1: Missing FHE.allowThis() ============

    /// @notice ANTI-PATTERN: Stores value without allowThis
    /// @dev Future contract operations on this value may fail!
    /// @param input Encrypted input value
    function setBadValueNoAllowThis(externalEuint64 input) external {
        // NOTE: In real code, you'd need inputProof, but this anti-pattern
        // demonstrates what happens when you forget permissions
        // For testing purposes, we're using a simplified version
        _valueWithoutAllow = FHE.asEuint64(0); // Placeholder for demo

        // MISSING: FHE.allowThis(value);
        // Future operations like add, compare will fail!

        // User also can't decrypt
        // MISSING: FHE.allow(value, msg.sender);

        emit ValueSet("No allowThis - will break!");
    }

    /// @notice Try to use the badly stored value
    /// @dev This will fail because allowThis was not called!
    /// @param addend Encrypted value to add
    /// @param inputProof ZK proof for the encrypted input
    function tryToUseBadValue(
        externalEuint64 addend,
        bytes calldata inputProof
    ) external {
        euint64 add = FHE.fromExternal(addend, inputProof);

        // THIS WILL FAIL or behave unexpectedly!
        // The contract doesn't have permission to use _valueWithoutAllow
        _computedValue = FHE.add(_valueWithoutAllow, add);

        // Even if it somehow works, storing the result without allow
        // continues the problem
    }

    // ============ ANTI-PATTERN 2: Missing FHE.allow() for user ============

    /// @notice ANTI-PATTERN: Stores value without user permission
    /// @dev User won't be able to decrypt their own value!
    /// @param input Encrypted input value
    function setBadValueNoUserAllow(externalEuint64 input) external {
        // Simplified for demo - in production use FHE.fromExternal with inputProof
        euint64 value = FHE.asEuint64(0); // Placeholder

        _valueWithoutAllow = value;

        // Has allowThis - contract can use it
        FHE.allowThis(value);

        // MISSING: FHE.allow(value, msg.sender);
        // User cannot decrypt their own value!

        emit ValueSet("No user allow - can't decrypt!");
    }

    // ============ CORRECT: Both permissions set ============

    /// @notice CORRECT: Stores value with all permissions
    /// @param input Encrypted input value
    /// @param inputProof ZK proof for the encrypted input
    function setGoodValue(
        externalEuint64 input,
        bytes calldata inputProof
    ) external {
        euint64 value = FHE.fromExternal(input, inputProof);

        _valueWithAllow = value;

        // CORRECT: Set both permissions
        FHE.allowThis(value);           // Contract can use it
        FHE.allow(value, msg.sender);   // User can decrypt it

        emit ValueSet("Correct - all permissions set!");
    }

    /// @notice Use the correctly stored value
    /// @param addend Encrypted value to add
    /// @param inputProof ZK proof for the encrypted input
    function useGoodValue(
        externalEuint64 addend,
        bytes calldata inputProof
    ) external {
        euint64 add = FHE.fromExternal(addend, inputProof);

        // This works because _valueWithAllow has allowThis
        _computedValue = FHE.add(_valueWithAllow, add);

        // IMPORTANT: New computed values need NEW permissions!
        FHE.allowThis(_computedValue);
        FHE.allow(_computedValue, msg.sender);
    }

    // ============ ANTI-PATTERN 3: Forgetting new values need new permissions ============

    /// @notice ANTI-PATTERN: Creates new value but forgets new permissions
    /// @dev FHE operations create NEW encrypted values that need permissions!
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof ZK proof for the encrypted inputs
    function badCompute(
        externalEuint64 a,
        externalEuint64 b,
        bytes calldata inputProof
    ) external {
        euint64 encA = FHE.fromExternal(a, inputProof);
        euint64 encB = FHE.fromExternal(b, inputProof);

        // Set permissions for inputs (correct)
        FHE.allowThis(encA);
        FHE.allowThis(encB);

        // Compute sum
        euint64 sum = FHE.add(encA, encB);

        _computedValue = sum;

        // MISSING: Permissions for the NEW 'sum' value!
        // FHE.allowThis(sum);
        // FHE.allow(sum, msg.sender);

        // User cannot decrypt 'sum' even though they could decrypt a and b!
    }

    /// @notice CORRECT: Sets permissions on computed values
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof ZK proof for the encrypted inputs
    function goodCompute(
        externalEuint64 a,
        externalEuint64 b,
        bytes calldata inputProof
    ) external {
        euint64 encA = FHE.fromExternal(a, inputProof);
        euint64 encB = FHE.fromExternal(b, inputProof);

        FHE.allowThis(encA);
        FHE.allowThis(encB);

        euint64 sum = FHE.add(encA, encB);

        _computedValue = sum;

        // CORRECT: New value needs new permissions!
        FHE.allowThis(sum);
        FHE.allow(sum, msg.sender);
    }

    // ============ View Functions ============

    function getValueWithoutAllow() external view returns (euint64) {
        return _valueWithoutAllow;
    }

    function getValueWithAllow() external view returns (euint64) {
        return _valueWithAllow;
    }

    function getComputedValue() external view returns (euint64) {
        return _computedValue;
    }
}
