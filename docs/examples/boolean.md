# Boolean Operations

🟢 **Beginner** | 📦 Basics

Encrypted boolean operations: NOT, AND, OR, and comparisons

## Overview

This example demonstrates encrypted boolean (ebool) operations in FHEVM. Learn how to negate booleans with FHE.not(), combine them with FHE.and() and FHE.or(), convert plaintext to encrypted with FHE.asEbool(), and understand how comparison operations (eq, gt, lt) return ebool results. Boolean logic is fundamental for conditional operations in FHE.

## Quick Start

```bash
# Create new project from this template
npx labz create boolean my-project

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

import { FHE, ebool, euint8, externalEbool, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Boolean Operations - Encrypted boolean logic
/// @notice Demonstrates ebool type and boolean FHE operations
/// @dev Shows FHE.not(), FHE.and(), FHE.or(), FHE.asEbool(), comparison to ebool
contract BooleanOps is ZamaEthereumConfig {
    /// @dev Stores various boolean results
    ebool private _result;
    ebool private _flag;

    // ============ Events ============
    event BooleanSet(address indexed user);
    event NotApplied(address indexed user);
    event AndApplied(address indexed user);
    event OrApplied(address indexed user);
    event ComparisonDone(address indexed user);

    // ============ Boolean Creation ============

    /// @notice Set an encrypted boolean value
    /// @param encryptedValue Encrypted boolean from client
    /// @param inputProof Zero-knowledge proof for the input
    function setBool(externalEbool encryptedValue, bytes calldata inputProof) external {
        // Convert external encrypted bool to internal ebool
        _flag = FHE.fromExternal(encryptedValue, inputProof);

        // Set permissions
        FHE.allowThis(_flag);
        FHE.allow(_flag, msg.sender);

        emit BooleanSet(msg.sender);
    }

    /// @notice Create ebool from plaintext (for initialization only!)
    /// @dev WARNING: This exposes the value! Only use for known public values
    /// @param value The plaintext boolean
    function setPlainBool(bool value) external {
        // Convert plaintext to encrypted boolean
        // This is visible on-chain! Only use for initialization
        _flag = FHE.asEbool(value);

        FHE.allowThis(_flag);
        FHE.allow(_flag, msg.sender);

        emit BooleanSet(msg.sender);
    }

    // ============ Boolean NOT ============

    /// @notice Apply NOT to the stored flag
    /// @dev Flips true <-> false in encrypted form
    function applyNot() external {
        // NOT operation: flips the encrypted boolean
        // If _flag is encrypted(true), result becomes encrypted(false)
        _result = FHE.not(_flag);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit NotApplied(msg.sender);
    }

    /// @notice Apply NOT to input and return
    /// @param encryptedValue Encrypted boolean to negate
    /// @param inputProof Zero-knowledge proof for the input
    function notValue(externalEbool encryptedValue, bytes calldata inputProof) external returns (ebool) {
        ebool input = FHE.fromExternal(encryptedValue, inputProof);
        _result = FHE.not(input);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit NotApplied(msg.sender);
        return _result;
    }

    // ============ Boolean AND ============

    /// @notice AND two encrypted booleans
    /// @param a First encrypted boolean
    /// @param b Second encrypted boolean
    /// @param inputProof Zero-knowledge proof for the inputs
    function andBools(externalEbool a, externalEbool b, bytes calldata inputProof) external returns (ebool) {
        ebool encA = FHE.fromExternal(a, inputProof);
        ebool encB = FHE.fromExternal(b, inputProof);

        // AND: true only if BOTH are true
        _result = FHE.and(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit AndApplied(msg.sender);
        return _result;
    }

    // ============ Boolean OR ============

    /// @notice OR two encrypted booleans
    /// @param a First encrypted boolean
    /// @param b Second encrypted boolean
    /// @param inputProof Zero-knowledge proof for the inputs
    function orBools(externalEbool a, externalEbool b, bytes calldata inputProof) external returns (ebool) {
        ebool encA = FHE.fromExternal(a, inputProof);
        ebool encB = FHE.fromExternal(b, inputProof);

        // OR: true if EITHER is true
        _result = FHE.or(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit OrApplied(msg.sender);
        return _result;
    }

    // ============ Comparison to ebool ============

    /// @notice Compare two encrypted integers, get ebool result
    /// @dev This shows how comparisons produce ebool values
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof Zero-knowledge proof for the inputs
    function isGreater(
        externalEuint8 a,
        externalEuint8 b,
        bytes calldata inputProof
    ) external returns (ebool) {
        euint8 encA = FHE.fromExternal(a, inputProof);
        euint8 encB = FHE.fromExternal(b, inputProof);

        // Comparison operations return ebool
        // This is useful for conditional logic
        _result = FHE.gt(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit ComparisonDone(msg.sender);
        return _result;
    }

    /// @notice Check equality of two encrypted values
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof Zero-knowledge proof for the inputs
    function isEqual(
        externalEuint8 a,
        externalEuint8 b,
        bytes calldata inputProof
    ) external returns (ebool) {
        euint8 encA = FHE.fromExternal(a, inputProof);
        euint8 encB = FHE.fromExternal(b, inputProof);

        // eq() returns ebool
        _result = FHE.eq(encA, encB);

        FHE.allowThis(_result);
        FHE.allow(_result, msg.sender);

        emit ComparisonDone(msg.sender);
        return _result;
    }

    // ============ View Functions ============

    /// @notice Get the last boolean result
    function getResult() external view returns (ebool) {
        return _result;
    }

    /// @notice Get the stored flag
    function getFlag() external view returns (ebool) {
        return _flag;
    }
}

```

## Code Explanation

### Imports

Import ebool for encrypted booleans and externalEbool for encrypted input. Also import euint8 for demonstrating comparisons that return ebool.

*Lines 1-5*

### Not Operation

FHE.not() negates an encrypted boolean. If the input is encrypted(true), the output is encrypted(false), and vice versa. The operation never reveals the actual value.

*Lines 48-60*

### And Operation

FHE.and() performs logical AND on two encrypted booleans. Returns encrypted(true) only if BOTH inputs are encrypted(true). Neither input nor result is ever visible.

*Lines 74-89*

### Or Operation

FHE.or() performs logical OR on two encrypted booleans. Returns encrypted(true) if EITHER input is encrypted(true). Useful for combining conditions.

*Lines 93-108*

### As Ebool

FHE.asEbool() converts a plaintext boolean to encrypted form. WARNING: The input value is visible on-chain! Only use for initialization with known public values.

*Lines 36-46*

### Comparison To Ebool

Comparison operations like FHE.gt(), FHE.lt(), FHE.eq() return ebool. This shows how to compare encrypted integers and get an encrypted boolean result.

*Lines 112-131*

## FHE Operations Used

- `FHE.not()`
- `FHE.and()`
- `FHE.or()`
- `FHE.asEbool()`
- `FHE.eq()`
- `FHE.gt()`
- `FHE.fromExternal()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `ebool`
- `euint8`
- `externalEbool`
- `externalEuint8`

## Tags

`ebool` `boolean` `FHE.not` `FHE.and` `FHE.or` `FHE.asEbool` `logic` `comparison`

## Related Examples

- [add](./add.md)
- [compare](./compare.md)
- [bitwise](./bitwise.md)

## Next Steps

After this example, check out:
- [bitwise](./bitwise.md)
- [compare](./compare.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
