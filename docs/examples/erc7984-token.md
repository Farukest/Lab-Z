# ERC7984 Confidential Token

🟡 **Intermediate** | 🏗️ OpenZeppelin Contracts

A confidential ERC7984 token implementation using OpenZeppelin's confidential contracts library

## Overview

This example demonstrates how to create a confidential token using OpenZeppelin's ERC7984 implementation. ERC7984 is the confidential token standard that keeps balances and transfer amounts encrypted. The token supports minting, burning, confidential transfers, and operator approvals with time-based expiry.

## Quick Start

```bash
# Create new project from this template
npx labz create erc7984-token my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Contract

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title ERC7984Example - Confidential Fungible Token
/// @notice A confidential token where balances and transfers are encrypted using FHE
/// @dev Extends OpenZeppelin's ERC7984 base implementation with minting/burning capabilities
contract ERC7984Example is ZamaEthereumConfig, ERC7984, Ownable2Step {

    // ============ Events ============

    /// @notice Emitted when tokens are minted
    event TokensMinted(address indexed to, uint64 amount);

    /// @notice Emitted when tokens are burned (confidential amount)
    event TokensBurned(address indexed from);

    // ============ Constructor ============

    /// @param owner The initial owner of the contract
    /// @param initialSupply Initial token supply to mint to owner
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param tokenURI_ Token metadata URI
    constructor(
        address owner,
        uint64 initialSupply,
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC7984(name_, symbol_, tokenURI_) Ownable(owner) {
        if (initialSupply > 0) {
            euint64 encryptedAmount = FHE.asEuint64(initialSupply);
            _mint(owner, encryptedAmount);
        }
    }

    // ============ Minting Functions ============

    /// @notice Mint tokens with a visible amount (for public mints)
    /// @param to Recipient address
    /// @param amount Amount to mint (visible in calldata)
    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, FHE.asEuint64(amount));
        emit TokensMinted(to, amount);
    }

    /// @notice Mint tokens with an encrypted amount (for private mints)
    /// @param to Recipient address
    /// @param encryptedAmount Encrypted amount from client
    /// @param inputProof Proof validating the encrypted input
    function confidentialMint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner returns (euint64 transferred) {
        transferred = _mint(to, FHE.fromExternal(encryptedAmount, inputProof));
        emit TokensBurned(to);
    }

    // ============ Burning Functions ============

    /// @notice Burn tokens with a visible amount
    /// @param from Address to burn from
    /// @param amount Amount to burn (visible in calldata)
    function burn(address from, uint64 amount) external onlyOwner {
        _burn(from, FHE.asEuint64(amount));
        emit TokensBurned(from);
    }

    /// @notice Burn tokens with an encrypted amount
    /// @param from Address to burn from
    /// @param encryptedAmount Encrypted amount from client
    /// @param inputProof Proof validating the encrypted input
    function confidentialBurn(
        address from,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOwner returns (euint64 transferred) {
        transferred = _burn(from, FHE.fromExternal(encryptedAmount, inputProof));
        emit TokensBurned(from);
    }

    // ============ View Functions ============

    /// @notice Get token decimals (ERC7984 uses 6 decimals by default)
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    /// @notice Check if an address has any balance
    /// @param account Address to check
    /// @return True if balance is initialized (may still be zero)
    function hasBalance(address account) external view returns (bool) {
        euint64 balance = confidentialBalanceOf(account);
        return FHE.isInitialized(balance);
    }
}

```

## Code Explanation

### Inheritance

Imports OpenZeppelin's ERC7984 base contract along with Ownable for access control. ERC7984 provides all the confidential token functionality.

*Lines 1-10*

### Constructor

Constructor initializes the token with name, symbol, decimals, and contract URI. Optionally mints initial supply to the owner.

*Lines 15-25*

### Mint

Owner-only function to mint new tokens. Supports both visible amount minting (for public allocations) and confidential minting (for private allocations).

*Lines 27-35*

### Confidential Transfer

Transfer tokens with encrypted amount. The actual transfer amount is never revealed on-chain, only the sender and recipient can see it.

*Lines 40-55*

### Operators

Operator system allows delegated transfers with time-based expiry. Unlike ERC20 allowances, operators have full transfer capability within their validity period.

*Lines 60-75*

## FHE Operations Used

- `FHE.confidentialTransfer()`
- `FHE.confidentialMint()`
- `FHE.confidentialBurn()`
- `FHE.setOperator()`

## FHE Types Used

- `euint64`

## Tags

`ERC7984` `token` `confidential` `OpenZeppelin` `transfer` `mint` `burn` `operator`

## Related Examples

- [erc7984-wrapper](./erc7984-wrapper.md)
- [erc7984-swap](./erc7984-swap.md)

## Prerequisites

Before this example, you should understand:
- [counter](./counter.md)
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [erc7984-wrapper](./erc7984-wrapper.md)
- [lottery-erc7984](./lottery-erc7984.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
