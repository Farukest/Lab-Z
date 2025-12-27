// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, euint64, externalEuint8, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Bitwise Operations - Encrypted bit manipulation
/// @notice Demonstrates FHE.and(), FHE.or(), FHE.xor(), FHE.shl(), FHE.shr()
/// @dev Bitwise operations on encrypted integers for flags, masks, and bit manipulation
contract BitwiseOps is ZamaEthereumConfig {
    /// @dev Store operation results
    euint8 private _result8;
    euint64 private _result64;

    // ============ Events ============
    event AndDone(address indexed user);
    event OrDone(address indexed user);
    event XorDone(address indexed user);
    event ShiftDone(address indexed user);

    // ============ Bitwise AND ============

    /// @notice Bitwise AND of two encrypted values
    /// @dev Sets bits to 1 only where BOTH inputs have 1
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof Zero-knowledge proof for the inputs
    function bitwiseAnd(
        externalEuint8 a,
        externalEuint8 b,
        bytes calldata inputProof
    ) external returns (euint8) {
        euint8 encA = FHE.fromExternal(a, inputProof);
        euint8 encB = FHE.fromExternal(b, inputProof);

        // Bitwise AND: 1010 & 1100 = 1000
        _result8 = FHE.and(encA, encB);

        FHE.allowThis(_result8);
        FHE.allow(_result8, msg.sender);

        emit AndDone(msg.sender);
        return _result8;
    }

    /// @notice Apply bitmask to extract specific bits
    /// @dev Useful for reading flags from a bitfield
    /// @param value Encrypted value with multiple flags
    /// @param mask Plaintext mask (visible on-chain!)
    /// @param inputProof Zero-knowledge proof for the input
    function applyMask(
        externalEuint8 value,
        uint8 mask,
        bytes calldata inputProof
    ) external returns (euint8) {
        euint8 encValue = FHE.fromExternal(value, inputProof);

        // AND with mask to extract specific bits
        // e.g., value=0b11010110, mask=0b00001111 -> 0b00000110
        _result8 = FHE.and(encValue, FHE.asEuint8(mask));

        FHE.allowThis(_result8);
        FHE.allow(_result8, msg.sender);

        emit AndDone(msg.sender);
        return _result8;
    }

    // ============ Bitwise OR ============

    /// @notice Bitwise OR of two encrypted values
    /// @dev Sets bits to 1 where EITHER input has 1
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof Zero-knowledge proof for the inputs
    function bitwiseOr(
        externalEuint8 a,
        externalEuint8 b,
        bytes calldata inputProof
    ) external returns (euint8) {
        euint8 encA = FHE.fromExternal(a, inputProof);
        euint8 encB = FHE.fromExternal(b, inputProof);

        // Bitwise OR: 1010 | 1100 = 1110
        _result8 = FHE.or(encA, encB);

        FHE.allowThis(_result8);
        FHE.allow(_result8, msg.sender);

        emit OrDone(msg.sender);
        return _result8;
    }

    /// @notice Set specific bits using OR with mask
    /// @dev Useful for setting flags in a bitfield
    /// @param value Encrypted value
    /// @param bitsToSet Plaintext mask of bits to set (visible!)
    /// @param inputProof Zero-knowledge proof for the input
    function setBits(
        externalEuint8 value,
        uint8 bitsToSet,
        bytes calldata inputProof
    ) external returns (euint8) {
        euint8 encValue = FHE.fromExternal(value, inputProof);

        // OR with mask to set specific bits
        // e.g., value=0b00000001, bitsToSet=0b00000010 -> 0b00000011
        _result8 = FHE.or(encValue, FHE.asEuint8(bitsToSet));

        FHE.allowThis(_result8);
        FHE.allow(_result8, msg.sender);

        emit OrDone(msg.sender);
        return _result8;
    }

    // ============ Bitwise XOR ============

    /// @notice Bitwise XOR of two encrypted values
    /// @dev Sets bits to 1 where inputs DIFFER
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof Zero-knowledge proof for the inputs
    function bitwiseXor(
        externalEuint8 a,
        externalEuint8 b,
        bytes calldata inputProof
    ) external returns (euint8) {
        euint8 encA = FHE.fromExternal(a, inputProof);
        euint8 encB = FHE.fromExternal(b, inputProof);

        // Bitwise XOR: 1010 ^ 1100 = 0110
        _result8 = FHE.xor(encA, encB);

        FHE.allowThis(_result8);
        FHE.allow(_result8, msg.sender);

        emit XorDone(msg.sender);
        return _result8;
    }

    /// @notice Toggle specific bits using XOR
    /// @dev XOR with 1 flips the bit, XOR with 0 keeps it
    /// @param value Encrypted value
    /// @param bitsToToggle Plaintext mask of bits to toggle (visible!)
    /// @param inputProof Zero-knowledge proof for the input
    function toggleBits(
        externalEuint8 value,
        uint8 bitsToToggle,
        bytes calldata inputProof
    ) external returns (euint8) {
        euint8 encValue = FHE.fromExternal(value, inputProof);

        // XOR to toggle specific bits
        // e.g., value=0b00000011, toggle=0b00000001 -> 0b00000010
        _result8 = FHE.xor(encValue, FHE.asEuint8(bitsToToggle));

        FHE.allowThis(_result8);
        FHE.allow(_result8, msg.sender);

        emit XorDone(msg.sender);
        return _result8;
    }

    // ============ Bit Shifting ============

    /// @notice Shift left (multiply by powers of 2)
    /// @dev Each shift left doubles the value
    /// @param value Encrypted value to shift
    /// @param positions Number of positions to shift (plaintext, visible!)
    /// @param inputProof Zero-knowledge proof for the input
    function shiftLeft(
        externalEuint64 value,
        uint8 positions,
        bytes calldata inputProof
    ) external returns (euint64) {
        euint64 encValue = FHE.fromExternal(value, inputProof);

        // Shift left: 0b00000001 << 3 = 0b00001000 (1 -> 8)
        // Equivalent to multiplying by 2^positions
        _result64 = FHE.shl(encValue, FHE.asEuint8(positions));

        FHE.allowThis(_result64);
        FHE.allow(_result64, msg.sender);

        emit ShiftDone(msg.sender);
        return _result64;
    }

    /// @notice Shift right (divide by powers of 2)
    /// @dev Each shift right halves the value (floors)
    /// @param value Encrypted value to shift
    /// @param positions Number of positions to shift (plaintext, visible!)
    /// @param inputProof Zero-knowledge proof for the input
    function shiftRight(
        externalEuint64 value,
        uint8 positions,
        bytes calldata inputProof
    ) external returns (euint64) {
        euint64 encValue = FHE.fromExternal(value, inputProof);

        // Shift right: 0b00001000 >> 2 = 0b00000010 (8 -> 2)
        // Equivalent to dividing by 2^positions (floored)
        _result64 = FHE.shr(encValue, FHE.asEuint8(positions));

        FHE.allowThis(_result64);
        FHE.allow(_result64, msg.sender);

        emit ShiftDone(msg.sender);
        return _result64;
    }

    /// @notice Efficient multiply by power of 2
    /// @dev Faster than regular multiplication for 2^n
    /// @param value Encrypted value
    /// @param power The power of 2 (e.g., 3 means multiply by 8)
    /// @param inputProof Zero-knowledge proof for the input
    function multiplyByPowerOf2(
        externalEuint64 value,
        uint8 power,
        bytes calldata inputProof
    ) external returns (euint64) {
        euint64 encValue = FHE.fromExternal(value, inputProof);

        // value * 2^power using shift
        _result64 = FHE.shl(encValue, FHE.asEuint8(power));

        FHE.allowThis(_result64);
        FHE.allow(_result64, msg.sender);

        emit ShiftDone(msg.sender);
        return _result64;
    }

    /// @notice Efficient divide by power of 2
    /// @dev Faster than regular division for 2^n
    /// @param value Encrypted value
    /// @param power The power of 2 (e.g., 3 means divide by 8)
    /// @param inputProof Zero-knowledge proof for the input
    function divideByPowerOf2(
        externalEuint64 value,
        uint8 power,
        bytes calldata inputProof
    ) external returns (euint64) {
        euint64 encValue = FHE.fromExternal(value, inputProof);

        // value / 2^power using shift (floored)
        _result64 = FHE.shr(encValue, FHE.asEuint8(power));

        FHE.allowThis(_result64);
        FHE.allow(_result64, msg.sender);

        emit ShiftDone(msg.sender);
        return _result64;
    }

    // ============ View Functions ============

    /// @notice Get last 8-bit result
    function getResult8() external view returns (euint8) {
        return _result8;
    }

    /// @notice Get last 64-bit result
    function getResult64() external view returns (euint64) {
        return _result64;
    }
}
