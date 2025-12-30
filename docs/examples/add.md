# Encrypted Addition

🟢 **Beginner** | 📦 Basics

Add two encrypted values and return the encrypted result

## Overview

This example demonstrates the most fundamental FHE operation: adding two encrypted values. The operation happens entirely on encrypted data - neither the inputs nor the result are ever visible on-chain. This is the building block for more complex encrypted computations.

## Quick Start

```bash
# Create new project from this template
npx labz create add my-project

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

/// @title Encrypted Addition - Add two encrypted values
/// @notice Demonstrates the most basic FHE arithmetic operation
contract EncryptedAdd is ZamaEthereumConfig {
    /// @dev Stores the last computed result
    euint64 private _result;

    /// @notice Add two encrypted 64-bit values
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof Combined proof for both inputs
    /// @return The encrypted sum (handle)
    function add(
        externalEuint64 a,
        externalEuint64 b,
        bytes calldata inputProof
    ) external returns (euint64) {
        // Convert external inputs to internal encrypted values
        euint64 encryptedA = FHE.fromExternal(a, inputProof);
        euint64 encryptedB = FHE.fromExternal(b, inputProof);

        // Perform encrypted addition
        // Neither a, b, nor the result are ever visible!
        _result = FHE.add(encryptedA, encryptedB);

        // Set permissions
        FHE.allowThis(_result);        // Contract can use this value
        FHE.allow(_result, msg.sender); // Caller can decrypt

        return _result;
    }

    /// @notice Get the last computed result
    function getResult() external view returns (euint64) {
        return _result;
    }
}

```

## Code Explanation

### Imports

Import FHE library with euint64 for 64-bit encrypted integers. Using euint64 provides larger range than euint32 for arithmetic operations.

*Lines 1-5*

### Add Function

The add function takes two external encrypted values with their proofs, converts them using FHE.fromExternal, then adds them with FHE.add. The result is a new encrypted value that nobody can see.

*Lines 11-22*

### Acl

After creating a new encrypted value, we must set permissions. allowThis lets the contract use it later, allow lets the caller decrypt it off-chain.

*Lines 19-21*

## Tags

`add` `arithmetic` `euint64` `FHE.add` `basic operation` `beginner`

## Related Examples

- [counter](./counter.md)
- [compare](./compare.md)

## Prerequisites

Before this example, you should understand:
- [counter](./counter.md)

## Next Steps

After this example, check out:
- [compare](./compare.md)
- [encryption-single](./encryption-single.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
