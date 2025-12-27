// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Multiply Operations - Encrypted multiplication, division, and modulo
/// @notice Demonstrates FHE.mul(), FHE.div(), FHE.rem() operations
/// @dev IMPORTANT: Division and modulo only support PLAINTEXT divisors in FHEVM!
///      You cannot divide encrypted by encrypted - only by known values.
contract MultiplyOps is ZamaEthereumConfig {
    /// @dev Stores operation results
    euint64 private _result;
    euint64 private _quotient;
    euint64 private _remainder;

    // ============ Events ============
    event MultiplyDone(address indexed user);
    event DivideDone(address indexed user);
    event ModuloDone(address indexed user);
    event DivModDone(address indexed user);

    // ============ Multiplication ============

    /// @notice Multiply two encrypted values
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof Zero-knowledge proof for the inputs
    /// @return The encrypted product
    function multiply(
        externalEuint64 a,
        externalEuint64 b,
        bytes calldata inputProof
    ) external returns (euint64) {
        euint64 encA = FHE.fromExternal(a, inputProof);
        euint64 encB = FHE.fromExternal(b, inputProof);

        // Encrypted multiplication
        // Result is encrypted: nobody knows a, b, or a*b
        _result = FHE.mul(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit MultiplyDone(msg.sender);
        return _result;
    }

    /// @notice Multiply encrypted value by plaintext scalar
    /// @dev Useful when multiplier is public (e.g., tax rate)
    /// @param encrypted The encrypted value
    /// @param scalar The plaintext multiplier (visible on-chain!)
    /// @param inputProof Zero-knowledge proof for the input
    function multiplyByScalar(
        externalEuint64 encrypted,
        uint64 scalar,
        bytes calldata inputProof
    ) external returns (euint64) {
        euint64 encValue = FHE.fromExternal(encrypted, inputProof);

        // Multiply encrypted by plaintext
        // Note: scalar is visible, but encValue and result are not
        _result = FHE.mul(encValue, FHE.asEuint64(scalar));

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit MultiplyDone(msg.sender);
        return _result;
    }

    // ============ Division ============
    // NOTE: FHEVM only supports division by PLAINTEXT values!
    // Encrypted / Encrypted is NOT supported.

    /// @notice Divide encrypted value by plaintext scalar
    /// @dev FHEVM LIMITATION: Can only divide by plaintext, not encrypted values!
    /// @param dividend The encrypted value to divide
    /// @param scalar The plaintext divisor (visible on-chain!)
    /// @param inputProof Zero-knowledge proof for the input
    function divideByScalar(
        externalEuint64 dividend,
        uint64 scalar,
        bytes calldata inputProof
    ) external returns (euint64) {
        require(scalar != 0, "Division by zero");

        euint64 encDividend = FHE.fromExternal(dividend, inputProof);

        // Divide encrypted by plaintext
        // Integer division: 10 / 3 = 3 (not 3.33...)
        _result = FHE.div(encDividend, scalar);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit DivideDone(msg.sender);
        return _result;
    }

    // ============ Modulo (Remainder) ============
    // NOTE: FHEVM only supports modulo by PLAINTEXT values!

    /// @notice Modulo with plaintext divisor
    /// @dev FHEVM LIMITATION: Can only modulo by plaintext, not encrypted values!
    /// @param dividend The encrypted value
    /// @param scalar The plaintext divisor (visible on-chain!)
    /// @param inputProof Zero-knowledge proof for the input
    function moduloByScalar(
        externalEuint64 dividend,
        uint64 scalar,
        bytes calldata inputProof
    ) external returns (euint64) {
        require(scalar != 0, "Modulo by zero");

        euint64 encDividend = FHE.fromExternal(dividend, inputProof);

        // Modulo: returns remainder
        // e.g., 10 % 3 = 1
        _result = FHE.rem(encDividend, scalar);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit ModuloDone(msg.sender);
        return _result;
    }

    // ============ Combined Operations ============

    /// @notice Get both quotient and remainder (divmod) with plaintext divisor
    /// @dev FHEVM LIMITATION: Divisor must be plaintext
    /// @param dividend The encrypted value to divide
    /// @param scalar The plaintext divisor (visible on-chain!)
    /// @param inputProof Zero-knowledge proof for the input
    function divMod(
        externalEuint64 dividend,
        uint64 scalar,
        bytes calldata inputProof
    ) external {
        require(scalar != 0, "Division by zero");

        euint64 encDividend = FHE.fromExternal(dividend, inputProof);

        // Calculate both quotient and remainder
        _quotient = FHE.div(encDividend, scalar);
        _remainder = FHE.rem(encDividend, scalar);

        FHE.allowThis(_quotient);
        FHE.allowThis(_remainder);
        FHE.allow(_quotient, msg.sender);
        FHE.allow(_remainder, msg.sender);

        emit DivModDone(msg.sender);
    }

    /// @notice Calculate percentage (value * percentage / 100)
    /// @dev Useful for fees, discounts, etc.
    /// @param value The encrypted base value
    /// @param percentage The percentage (e.g., 15 for 15%)
    /// @param inputProof Zero-knowledge proof for the input
    function calculatePercentage(
        externalEuint64 value,
        uint64 percentage,
        bytes calldata inputProof
    ) external returns (euint64) {
        require(percentage <= 100, "Percentage > 100");

        euint64 encValue = FHE.fromExternal(value, inputProof);

        // Calculate: value * percentage / 100
        euint64 multiplied = FHE.mul(encValue, FHE.asEuint64(percentage));
        _result = FHE.div(multiplied, 100);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit MultiplyDone(msg.sender);
        return _result;
    }

    // ============ View Functions ============

    /// @notice Get the last result
    function getResult() external view returns (euint64) {
        return _result;
    }

    /// @notice Get quotient from divMod
    function getQuotient() external view returns (euint64) {
        return _quotient;
    }

    /// @notice Get remainder from divMod
    function getRemainder() external view returns (euint64) {
        return _remainder;
    }
}
