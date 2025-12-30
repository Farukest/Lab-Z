# ERC7984 ERC20 Wrapper

🟡 **Intermediate** | 🏗️ OpenZeppelin Contracts

Wrap ERC20 tokens into confidential ERC7984 tokens and unwrap back

## Overview

This example demonstrates how to wrap standard ERC20 tokens into confidential ERC7984 tokens. Users can deposit their ERC20 tokens and receive wrapped confidential tokens with encrypted balances. The wrapper handles decimal conversion and maintains a 1:1 backing ratio.

## Quick Start

```bash
# Create new project from this template
npx labz create erc7984-wrapper my-project

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

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984ERC20Wrapper, ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

/// @title ERC7984ERC20WrapperExample - Bridge between ERC20 and Confidential Tokens
/// @notice Wraps an ERC20 token into a confidential ERC7984 token and vice versa
/// @dev Users deposit ERC20, receive ERC7984. Withdraw ERC7984, receive ERC20.
contract ERC7984ERC20WrapperExample is ERC7984ERC20Wrapper, ZamaEthereumConfig {

    // ============ Events ============

    /// @notice Emitted when ERC20 tokens are wrapped into ERC7984
    event TokensWrapped(address indexed user, uint256 amount);

    /// @notice Emitted when ERC7984 tokens are unwrapped to ERC20
    event TokensUnwrapped(address indexed user);

    // ============ Constructor ============

    /// @param underlyingToken The ERC20 token to wrap
    /// @param name_ Name for the wrapped token
    /// @param symbol_ Symbol for the wrapped token
    /// @param uri_ Metadata URI
    constructor(
        IERC20 underlyingToken,
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) ERC7984ERC20Wrapper(underlyingToken) ERC7984(name_, symbol_, uri_) {}

    // ============ View Functions ============

    /// @notice Get total ERC20 tokens held by this wrapper
    function totalDeposited() external view returns (uint256) {
        return IERC20(address(underlying())).balanceOf(address(this));
    }
}

```

## Code Explanation

### Wrap

Wrap function deposits ERC20 tokens and mints equivalent ERC7984 tokens. The underlying tokens are held by the wrapper contract.

*Lines 20-35*

### Unwrap

Unwrap function burns ERC7984 tokens and returns the underlying ERC20 tokens. Amount is encrypted so only the user knows how much they're withdrawing.

*Lines 40-55*

## FHE Operations Used

- `FHE.wrap()`
- `FHE.unwrap()`
- `FHE.confidentialTransfer()`

## FHE Types Used

- `euint64`

## Tags

`ERC7984` `ERC20` `wrapper` `wrap` `unwrap` `bridge` `OpenZeppelin`

## Related Examples

- [erc7984-token](./erc7984-token.md)
- [swap-erc7984-to-erc20](./swap-erc7984-to-erc20.md)

## Prerequisites

Before this example, you should understand:
- [erc7984-token](./erc7984-token.md)

## Next Steps

After this example, check out:
- [swap-erc7984-to-erc20](./swap-erc7984-to-erc20.md)
- [amm-erc7984](./amm-erc7984.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
