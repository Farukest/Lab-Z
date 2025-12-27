// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SwapERC7984ToERC7984 - Confidential Token Swap
/// @notice Swap between two confidential ERC7984 tokens atomically
/// @dev Both input and output amounts remain encrypted throughout the swap
contract SwapERC7984ToERC7984 is ZamaEthereumConfig, ReentrancyGuard {

    // ============ Errors ============

    /// @dev Caller is not an operator for the fromToken
    error NotOperator(address user, address token);

    /// @dev Insufficient balance in the pool
    error InsufficientPoolBalance();

    // ============ Events ============

    /// @notice Emitted when a confidential swap is executed
    event ConfidentialSwap(
        address indexed user,
        address indexed fromToken,
        address indexed toToken
    );

    /// @notice Emitted when liquidity is added to a token
    event LiquidityAdded(address indexed token, address indexed provider);

    // ============ State ============

    /// @dev Pool balances for each token (encrypted)
    mapping(address token => euint64 balance) private _poolBalances;

    // ============ Swap Functions ============

    /// @notice Swap confidential tokens 1:1 (same amount in and out)
    /// @param fromToken The token to swap from
    /// @param toToken The token to swap to
    /// @param amountInput Encrypted amount to swap
    /// @param inputProof Proof for the encrypted input
    function swapConfidentialForConfidential(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 amountInput,
        bytes calldata inputProof
    ) external nonReentrant {
        // Verify caller is operator (can transfer on their behalf)
        if (!fromToken.isOperator(msg.sender, address(this))) {
            revert NotOperator(msg.sender, address(fromToken));
        }

        euint64 amount = FHE.fromExternal(amountInput, inputProof);

        // Transfer fromToken to this contract
        FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // Transfer toToken to user (same amount - 1:1 swap)
        FHE.allowTransient(amountTransferred, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountTransferred);

        emit ConfidentialSwap(msg.sender, address(fromToken), address(toToken));
    }

    /// @notice Swap with a custom rate (amountOut = amountIn * rate / 1e6)
    /// @param fromToken The token to swap from
    /// @param toToken The token to swap to
    /// @param amountInput Encrypted amount to swap
    /// @param inputProof Proof for the encrypted input
    /// @param rate Exchange rate (1e6 = 1:1, 2e6 = 2:1)
    function swapWithRate(
        IERC7984 fromToken,
        IERC7984 toToken,
        externalEuint64 amountInput,
        bytes calldata inputProof,
        uint64 rate
    ) external nonReentrant {
        if (!fromToken.isOperator(msg.sender, address(this))) {
            revert NotOperator(msg.sender, address(fromToken));
        }

        euint64 amount = FHE.fromExternal(amountInput, inputProof);

        // Transfer fromToken to this contract
        FHE.allowTransient(amount, address(fromToken));
        euint64 amountTransferred = fromToken.confidentialTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // Calculate output amount with rate
        euint64 amountOut = FHE.div(
            FHE.mul(amountTransferred, rate),
            1000000 // 1e6 precision
        );

        // Transfer toToken to user
        FHE.allowTransient(amountOut, address(toToken));
        toToken.confidentialTransfer(msg.sender, amountOut);

        emit ConfidentialSwap(msg.sender, address(fromToken), address(toToken));
    }

    // ============ Liquidity Functions ============

    /// @notice Add liquidity to the pool (for swap availability)
    /// @param token The token to add liquidity for
    /// @param amount Encrypted amount to add
    /// @param inputProof Proof for the encrypted input
    function addLiquidity(
        IERC7984 token,
        externalEuint64 amount,
        bytes calldata inputProof
    ) external nonReentrant {
        euint64 encAmount = FHE.fromExternal(amount, inputProof);

        FHE.allowTransient(encAmount, address(token));
        euint64 transferred = token.confidentialTransferFrom(
            msg.sender,
            address(this),
            encAmount
        );

        // Update pool balance
        euint64 newBalance = FHE.add(_poolBalances[address(token)], transferred);
        FHE.allowThis(newBalance);
        _poolBalances[address(token)] = newBalance;

        emit LiquidityAdded(address(token), msg.sender);
    }

    // ============ View Functions ============

    /// @notice Get the encrypted pool balance for a token
    /// @param token The token address
    /// @return The encrypted balance handle
    function getPoolBalance(address token) external view returns (euint64) {
        return _poolBalances[token];
    }
}
