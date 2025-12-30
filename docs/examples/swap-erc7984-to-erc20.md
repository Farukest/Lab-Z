# Swap ERC7984 to ERC20

🔴 **Advanced** | 🏗️ OpenZeppelin Contracts

Atomic swap between confidential ERC7984 and standard ERC20 tokens

## Overview

This example implements an atomic swap contract that allows users to exchange confidential ERC7984 tokens for standard ERC20 tokens. The swap amount remains confidential while the exchange rate is public. Useful for DEX integrations and bridging between confidential and public token systems.

## Quick Start

```bash
# Create new project from this template
npx labz create swap-erc7984-to-erc20 my-project

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

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SwapERC7984ToERC20 - Swap Confidential Tokens for Public Tokens
/// @notice Allows swapping ERC7984 (confidential) tokens for ERC20 (public) tokens
/// @dev Two-phase swap: user deposits confidential tokens, admin releases public tokens
contract SwapERC7984ToERC20 is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Errors ============

    error SwapNotFound();
    error SwapAlreadyProcessed();
    error InvalidRate();
    error InsufficientLiquidity(uint256 requested, uint256 available);
    error NotSwapOwner();
    error DecryptionAlreadyRequested();
    error SwapAlreadyProcessing();

    // ============ Events ============

    /// @notice Emitted when a swap is initiated
    event SwapInitiated(
        uint256 indexed swapId,
        address indexed user,
        address confidentialToken,
        address publicToken
    );

    /// @notice Emitted when a swap is completed by admin
    event SwapCompleted(uint256 indexed swapId, address indexed user, uint64 amount);

    /// @notice Emitted when a swap is cancelled
    event SwapCancelled(uint256 indexed swapId);

    /// @notice Emitted when decryption is requested
    event DecryptionRequested(uint256 indexed swapId);

    /// @notice Emitted when liquidity is added
    event LiquidityAdded(address indexed provider, uint256 amount);

    // ============ Structs ============

    struct SwapRequest {
        address user;
        IERC7984 confidentialToken;
        IERC20 publicToken;
        euint64 encryptedAmount;
        uint256 rate;
        bool completed;
        bool cancelled;
        bool decryptionRequested;
    }

    // ============ State ============

    /// @dev All swap requests
    SwapRequest[] private _swaps;

    /// @dev Mapping from user to their swap IDs
    mapping(address => uint256[]) private _userSwaps;

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Swap Functions ============

    /// @notice Initiate a swap from ERC7984 to ERC20
    /// @param confidentialToken The ERC7984 token to swap from
    /// @param publicToken The ERC20 token to swap to
    /// @param encryptedAmount Encrypted amount to swap
    /// @param inputProof Proof for the encrypted input
    /// @param rate Exchange rate (1e6 = 1:1)
    /// @return swapId The swap request ID
    function initiateSwap(
        address confidentialToken,
        address publicToken,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof,
        uint256 rate
    ) external nonReentrant returns (uint256 swapId) {
        if (rate == 0) revert InvalidRate();

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer confidential tokens to this contract
        IERC7984 confToken = IERC7984(confidentialToken);
        FHE.allowTransient(amount, confidentialToken);
        euint64 amountReceived = confToken.confidentialTransferFrom(
            msg.sender,
            address(this),
            amount
        );
        FHE.allowThis(amountReceived);

        // Create swap request
        swapId = _swaps.length;
        _swaps.push(SwapRequest({
            user: msg.sender,
            confidentialToken: confToken,
            publicToken: IERC20(publicToken),
            encryptedAmount: amountReceived,
            rate: rate,
            completed: false,
            cancelled: false,
            decryptionRequested: false
        }));

        _userSwaps[msg.sender].push(swapId);

        emit SwapInitiated(swapId, msg.sender, confidentialToken, publicToken);
    }

    /// @notice Request decryption for a swap (marks it as pending)
    /// @param swapId The swap to request decryption for
    function requestDecryption(uint256 swapId) external {
        if (swapId >= _swaps.length) revert SwapNotFound();
        SwapRequest storage swap = _swaps[swapId];
        if (swap.completed || swap.cancelled) revert SwapAlreadyProcessed();
        if (swap.decryptionRequested) revert DecryptionAlreadyRequested();

        swap.decryptionRequested = true;
        emit DecryptionRequested(swapId);
    }

    /// @notice Complete a swap (owner only, after offchain verification)
    /// @param swapId The swap to complete
    /// @param decryptedAmount The verified decrypted amount
    function completeSwap(
        uint256 swapId,
        uint64 decryptedAmount
    ) external onlyOwner nonReentrant {
        if (swapId >= _swaps.length) revert SwapNotFound();
        SwapRequest storage swap = _swaps[swapId];
        if (swap.completed || swap.cancelled) revert SwapAlreadyProcessed();

        swap.completed = true;

        // Calculate output amount with rate
        uint256 outputAmount = (uint256(decryptedAmount) * swap.rate) / 1e6;

        // Transfer public tokens to user
        if (outputAmount > 0) {
            uint256 available = swap.publicToken.balanceOf(address(this));
            if (available < outputAmount) revert InsufficientLiquidity(outputAmount, available);
            swap.publicToken.safeTransfer(swap.user, outputAmount);
        }

        emit SwapCompleted(swapId, swap.user, decryptedAmount);
    }

    /// @notice Cancel a pending swap and return tokens
    /// @param swapId The swap to cancel
    function cancelSwap(uint256 swapId) external nonReentrant {
        if (swapId >= _swaps.length) revert SwapNotFound();
        SwapRequest storage swap = _swaps[swapId];
        if (swap.user != msg.sender) revert NotSwapOwner();
        if (swap.completed || swap.cancelled) revert SwapAlreadyProcessed();
        if (swap.decryptionRequested) revert SwapAlreadyProcessing();

        swap.cancelled = true;

        // Return confidential tokens
        FHE.allowTransient(swap.encryptedAmount, address(swap.confidentialToken));
        swap.confidentialToken.confidentialTransfer(msg.sender, swap.encryptedAmount);

        emit SwapCancelled(swapId);
    }

    // ============ Liquidity Functions ============

    /// @notice Add ERC20 liquidity to the pool
    /// @param token The token to add
    /// @param amount Amount of tokens to add
    function addLiquidity(IERC20 token, uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit LiquidityAdded(msg.sender, amount);
    }

    // ============ View Functions ============

    /// @notice Get swap count
    function getSwapCount() external view returns (uint256) {
        return _swaps.length;
    }

    /// @notice Get swap details
    function getSwap(uint256 swapId) external view returns (
        address user,
        address confidentialToken,
        address publicToken,
        uint256 rate,
        bool completed,
        bool cancelled
    ) {
        if (swapId >= _swaps.length) revert SwapNotFound();
        SwapRequest storage swap = _swaps[swapId];
        return (
            swap.user,
            address(swap.confidentialToken),
            address(swap.publicToken),
            swap.rate,
            swap.completed,
            swap.cancelled
        );
    }

    /// @notice Get all swap IDs for a user
    function getUserSwaps(address user) external view returns (uint256[] memory) {
        return _userSwaps[user];
    }

    /// @notice Get available liquidity for a token
    function getAvailableLiquidity(IERC20 token) external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}

```

## Code Explanation

### Create Swap

Creates a new swap offer with encrypted ERC7984 amount. The offer is stored and can be accepted by anyone with matching ERC20 tokens.

*Lines 25-45*

### Accept Swap

Accepts an existing swap offer by providing ERC20 tokens. The atomic swap ensures both parties receive their tokens or the transaction reverts.

*Lines 50-75*

## FHE Operations Used

- `FHE.confidentialTransferFrom()`
- `FHE.fromExternal()`

## FHE Types Used

- `euint64`

## Tags

`swap` `exchange` `ERC7984` `ERC20` `DEX` `OpenZeppelin`

## Related Examples

- [swap-erc7984-to-erc7984](./swap-erc7984-to-erc7984.md)
- [erc7984-wrapper](./erc7984-wrapper.md)

## Prerequisites

Before this example, you should understand:
- [erc7984-token](./erc7984-token.md)
- [erc7984-wrapper](./erc7984-wrapper.md)

## Next Steps

After this example, check out:
- [amm-erc7984](./amm-erc7984.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
