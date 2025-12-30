# FHE Counter

🟢 **Beginner** | 📦 Basics

A simple encrypted counter with increment and decrement operations

## Overview

This example demonstrates the fundamental concepts of FHEVM by implementing a basic counter that stores its value as an encrypted euint32. Users can increment or decrement the counter using encrypted inputs, and only authorized users can decrypt the current count value.

## Quick Start

```bash
# Create new project from this template
npx labz create counter my-project

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

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Counter - A simple encrypted counter
/// @notice Demonstrates basic FHEVM operations: encrypted state, add, sub, and ACL
contract FHECounter is ZamaEthereumConfig {
    /// @dev The encrypted counter value - stored as euint32
    euint32 private _count;

    /// @notice Returns the encrypted counter handle
    /// @dev Returns bytes32(0) if counter is uninitialized
    function getCount() external view returns (euint32) {
        return _count;
    }

    /// @notice Increments the counter by an encrypted value
    /// @param inputEuint32 The encrypted value to add (from client-side encryption)
    /// @param inputProof Zero-knowledge proof validating the encrypted input
    function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        // Convert external encrypted input to usable euint32
        euint32 evalue = FHE.fromExternal(inputEuint32, inputProof);

        // Perform encrypted addition
        _count = FHE.add(_count, evalue);

        // Grant permissions for the new encrypted value
        FHE.allowThis(_count);        // Allow contract to use this value
        FHE.allow(_count, msg.sender); // Allow caller to decrypt off-chain
    }

    /// @notice Decrements the counter by an encrypted value
    /// @param inputEuint32 The encrypted value to subtract (from client-side encryption)
    /// @param inputProof Zero-knowledge proof validating the encrypted input
    /// @dev No underflow check - for production, implement proper range validation
    function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        // Convert external encrypted input to usable euint32
        euint32 evalue = FHE.fromExternal(inputEuint32, inputProof);

        // Perform encrypted subtraction
        _count = FHE.sub(_count, evalue);

        // Grant permissions for the new encrypted value
        FHE.allowThis(_count);        // Allow contract to use this value
        FHE.allow(_count, msg.sender); // Allow caller to decrypt off-chain
    }
}

```

## Code Explanation

### Imports

Import the FHE library with encrypted types (euint32, externalEuint32) and the ZamaEthereumConfig for network configuration. These are essential for any FHEVM contract.

*Lines 1-5*

### Contract Declaration

The contract inherits from ZamaEthereumConfig which provides the necessary FHEVM configuration. The _count variable is an encrypted euint32 - its value is never visible on-chain.

*Lines 7-9*

### Get Count

Returns the encrypted counter handle. Note: This does NOT return the actual value - it returns a bytes32 handle that points to the encrypted value. Users need off-chain decryption to see the actual count.

*Lines 11-14*

### Increment

Increments the counter by an encrypted value. The input comes as externalEuint32 with a proof (inputProof) that validates the encryption. FHE.fromExternal converts it to usable euint32, then FHE.add performs encrypted addition.

*Lines 16-24*

### Decrement

Decrements the counter by an encrypted value. Similar to increment but uses FHE.sub for encrypted subtraction. Note: No underflow check is performed in this simple example.

*Lines 26-34*

### Permissions

FHE.allowThis grants the contract permission to use the encrypted value in future operations. FHE.allow grants the caller (msg.sender) permission to decrypt the value off-chain. Both are critical for proper ACL management.

*Lines 21-23*

## Tags

`counter` `euint32` `add` `sub` `state` `beginner` `FHE.add` `FHE.sub`

## Related Examples

- [add](./add.md)
- [encryption-single](./encryption-single.md)
- [user-decrypt-single](./user-decrypt-single.md)

## Next Steps

After this example, check out:
- [add](./add.md)
- [encryption-single](./encryption-single.md)
- [acl-allow](./acl-allow.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
