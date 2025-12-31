# Multiply Operations

🟢 **Beginner** | 📦 Basics

Encrypted multiplication, division, and modulo operations

## Overview

This example demonstrates multiplication-related FHE operations: FHE.mul() for multiplication, FHE.div() for integer division, and FHE.rem() for modulo (remainder). Learn how to perform these operations on encrypted values, use scalar operations with plaintext multipliers, and combine operations for practical use cases like fee calculations and percentages.

## Quick Start

```bash
# Create new project from this template
npx labz create multiply my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Contract

```solidity
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

```

## Code Explanation

### Multiply

FHE.mul() multiplies two encrypted values. The result is a new encrypted value - neither inputs nor output are ever visible on-chain.

*Lines 26-43*

### Multiply Scalar

Multiply encrypted value by a plaintext scalar. Useful when the multiplier is public (like tax rates). The scalar is visible, but the encrypted value and result remain private.

*Lines 47-61*

### Divide

FHE.div() performs integer division on encrypted values. Results are floored (10/3 = 3). Both operands and result stay encrypted.

*Lines 67-84*

### Modulo

FHE.rem() calculates the remainder of division. Example: 17 % 5 = 2. Useful for wrapping values, checking divisibility, and cyclic operations.

*Lines 106-121*

### Divmod

Calculate both quotient and remainder in one transaction. More efficient than separate calls when you need both values.

*Lines 145-162*

### Percentage

Calculate percentage: (value * percentage / 100). Common pattern for fees, discounts, and proportional calculations.

*Lines 166-184*

## FHE Operations Used

- `FHE.mul()`
- `FHE.div()`
- `FHE.rem()`
- `FHE.asEuint64()`
- `FHE.fromExternal()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint64`
- `externalEuint64`

## Tags

`mul` `div` `rem` `multiplication` `division` `modulo` `arithmetic` `FHE.mul` `FHE.div` `FHE.rem`

## Related Examples

- [add](./add.md)
- [boolean](./boolean.md)

## Prerequisites

Before this example, you should understand:
- [add](./add.md)

## Next Steps

After this example, check out:
- [bitwise](./bitwise.md)
- [boolean](./boolean.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
