# Private Token

🟡 **Intermediate** | 🚀 Advanced

ERC20-like token with encrypted balances and private transfers

## Overview

A fungible token implementation where all balances are encrypted. Transfers happen between encrypted amounts - no one can see how much anyone holds. Uses FHE.sub and FHE.add for balance updates with encrypted overflow checks.

## Quick Start

```bash
# Create new project from this template
npx labz create token my-project

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

import { FHE, euint64, euint8, ebool, eaddress, externalEuint64, externalEuint8, externalEbool, externalEaddress } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Token - Encrypted Token
/// @notice ERC20-like token with encrypted balances using FHE
/// @dev Generated with Lab-Z Composable Templates
contract Token is ZamaEthereumConfig {

    // ============ Errors ============

    /// @dev Insufficient balance for transfer
    error InsufficientBalance(address from);
    /// @dev Invalid recipient address
    error InvalidRecipient();
    /// @dev Invalid amount
    error InvalidAmount();


    // ============ Events ============

    /// @notice Emitted on transfer (amounts are encrypted, only addresses visible)
    event Transfer(address indexed from, address indexed to);
    /// @notice Emitted on mint
    event Mint(address indexed to);


    // ============ State Variables ============

    /// @dev Token name
    string private _name;

    /// @dev Token symbol
    string private _symbol;

    /// @dev Encrypted balances
    mapping(address => euint64) private _balances;

    /// @dev Encrypted total supply
    euint64 private _totalSupply;



    // ============ Modifiers ============



    // ============ Constructor ============

    constructor(
        string memory tokenName,
        string memory tokenSymbol
    ) {
        _name = tokenName;
        _symbol = tokenSymbol;
        _totalSupply = FHE.asEuint64(0);
        FHE.allowThis(_totalSupply);

    }

    // ============ External Functions ============

    /// @notice Transfer encrypted amount to recipient
    /// @param to Recipient address
    /// @param encryptedAmount Encrypted amount to transfer
    /// @param inputProof Zero-knowledge proof for the input
    function transfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external  {


        if (to == address(0)) {
            revert InvalidRecipient();
        }

        // Convert external input to internal encrypted value
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Check if sender has sufficient balance (encrypted comparison)
        ebool hasEnough = FHE.ge(_balances[msg.sender], amount);

        // Conditional transfer: if hasEnough, do the transfer, else amount becomes 0
        euint64 zero = FHE.asEuint64(0);
        euint64 transferAmount = FHE.select(hasEnough, amount, zero);

        // Update balances
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], transferAmount);
        _balances[to] = FHE.add(_balances[to], transferAmount);



        // Set ACL permissions
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[to], to);


        emit Transfer(msg.sender, to);
    }

    /// @notice Mint new tokens to an address
    /// @param to Recipient address
    /// @param encryptedAmount Encrypted amount to mint
    /// @param inputProof Zero-knowledge proof for the input
    function mint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external  {


        if (to == address(0)) {
            revert InvalidRecipient();
        }

        // Convert external input to internal encrypted value
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Update balance and total supply
        _balances[to] = FHE.add(_balances[to], amount);
        _totalSupply = FHE.add(_totalSupply, amount);



        // Set ACL permissions
        FHE.allowThis(_balances[to]);
        FHE.allowThis(_totalSupply);
        FHE.allow(_balances[to], to);


        emit Mint(to);
    }



    // ============ View Functions ============

    /// @notice Get token name
    /// @return The token name
    function name() external view returns (string memory) {
        return _name;
    }

    /// @notice Get token symbol
    /// @return The token symbol
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /// @notice Get encrypted balance of an address (requires ACL permission)
    /// @param account The address to query
    /// @return The encrypted balance
    function balanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Get encrypted total supply (requires ACL permission)
    /// @return The encrypted total supply
    function totalSupply() external view returns (euint64) {
        return _totalSupply;
    }



    // ============ Internal Functions ============

    /// @dev Internal function to initialize balance for an address
    function _initializeBalance(address account) internal {
        if (FHE.isInitialized(_balances[account])) {
            return;
        }
        _balances[account] = FHE.asEuint64(0);
        FHE.allowThis(_balances[account]);
        FHE.allow(_balances[account], account);
    }


}

```

## FHE Operations Used

- `FHE.add()`
- `FHE.sub()`
- `FHE.gte()`
- `FHE.select()`
- `FHE.allowThis()`
- `FHE.allow()`
- `FHE.fromExternal()`

## FHE Types Used

- `euint64`
- `externalEuint64`
- `ebool`

## Tags

`token` `erc20` `privacy` `defi` `balances`

## Related Examples

- [erc7984-token](./erc7984-token.md)
- [escrow](./escrow.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)
- [acl-allow](./acl-allow.md)

## Next Steps

After this example, check out:
- [erc7984-token](./erc7984-token.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
