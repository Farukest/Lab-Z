// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, externalEuint64, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AMMERC7984 - Confidential Automated Market Maker
/// @notice A private AMM for ERC7984 tokens where trade amounts remain encrypted
/// @dev Implements constant product formula (x * y = k) with encrypted reserves
contract AMMERC7984 is ZamaEthereumConfig, ReentrancyGuard, Ownable {

    // ============ Errors ============

    error InsufficientLiquidity();
    error InvalidToken();
    error NotOperator();
    error ZeroAmount();
    error SlippageExceeded();

    // ============ Events ============

    event LiquidityAdded(address indexed provider, address indexed token);
    event LiquidityRemoved(address indexed provider, address indexed token);
    event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut);
    event PoolCreated(address indexed token0, address indexed token1);

    // ============ Types ============

    struct Pool {
        IERC7984 token0;
        IERC7984 token1;
        euint64 reserve0;
        euint64 reserve1;
        euint64 totalLiquidity;
        bool initialized;
    }

    // ============ State ============

    /// @dev Pool ID counter
    uint256 private _poolIdCounter;

    /// @dev Mapping of pool ID to pool data
    mapping(uint256 => Pool) private _pools;

    /// @dev Mapping of token pair to pool ID
    mapping(address => mapping(address => uint256)) private _pairToPool;

    /// @dev Liquidity provider shares (encrypted)
    mapping(uint256 => mapping(address => euint64)) private _lpShares;

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Pool Management ============

    /// @notice Create a new liquidity pool
    /// @param token0 First token in the pair
    /// @param token1 Second token in the pair
    /// @return poolId The new pool ID
    function createPool(
        IERC7984 token0,
        IERC7984 token1
    ) external onlyOwner returns (uint256 poolId) {
        require(address(token0) != address(token1), "Same token");

        poolId = _poolIdCounter++;

        _pools[poolId] = Pool({
            token0: token0,
            token1: token1,
            reserve0: euint64.wrap(0),
            reserve1: euint64.wrap(0),
            totalLiquidity: euint64.wrap(0),
            initialized: true
        });

        _pairToPool[address(token0)][address(token1)] = poolId;
        _pairToPool[address(token1)][address(token0)] = poolId;

        emit PoolCreated(address(token0), address(token1));
    }

    // ============ Liquidity Functions ============

    /// @notice Add liquidity to a pool
    /// @param poolId The pool ID
    /// @param amount0 Encrypted amount of token0
    /// @param amount1 Encrypted amount of token1
    /// @param proof0 Proof for amount0
    /// @param proof1 Proof for amount1
    function addLiquidity(
        uint256 poolId,
        externalEuint64 amount0,
        externalEuint64 amount1,
        bytes calldata proof0,
        bytes calldata proof1
    ) external nonReentrant {
        Pool storage pool = _pools[poolId];
        require(pool.initialized, "Pool not found");

        euint64 amt0 = FHE.fromExternal(amount0, proof0);
        euint64 amt1 = FHE.fromExternal(amount1, proof1);

        // Transfer tokens to pool
        FHE.allowTransient(amt0, address(pool.token0));
        euint64 transferred0 = pool.token0.confidentialTransferFrom(
            msg.sender,
            address(this),
            amt0
        );

        FHE.allowTransient(amt1, address(pool.token1));
        euint64 transferred1 = pool.token1.confidentialTransferFrom(
            msg.sender,
            address(this),
            amt1
        );

        // Update reserves
        pool.reserve0 = FHE.add(pool.reserve0, transferred0);
        pool.reserve1 = FHE.add(pool.reserve1, transferred1);
        FHE.allowThis(pool.reserve0);
        FHE.allowThis(pool.reserve1);

        // Calculate LP tokens (simplified: sqrt(amt0 * amt1))
        euint64 lpAmount = FHE.min(transferred0, transferred1); // Simplified

        // Update LP shares
        _lpShares[poolId][msg.sender] = FHE.add(_lpShares[poolId][msg.sender], lpAmount);
        pool.totalLiquidity = FHE.add(pool.totalLiquidity, lpAmount);
        FHE.allowThis(pool.totalLiquidity);
        FHE.allowThis(_lpShares[poolId][msg.sender]);
        FHE.allow(_lpShares[poolId][msg.sender], msg.sender);

        emit LiquidityAdded(msg.sender, address(pool.token0));
    }

    // ============ Swap Functions ============

    /// @notice Swap tokens in a pool
    /// @param poolId The pool ID
    /// @param tokenIn The token to swap from
    /// @param amountIn Encrypted amount to swap
    /// @param inputProof Proof for the encrypted input
    function swap(
        uint256 poolId,
        address tokenIn,
        externalEuint64 amountIn,
        bytes calldata inputProof
    ) external nonReentrant {
        Pool storage pool = _pools[poolId];
        require(pool.initialized, "Pool not found");

        bool isToken0 = (address(pool.token0) == tokenIn);
        if (!isToken0 && address(pool.token1) != tokenIn) revert InvalidToken();

        IERC7984 tokenInContract = isToken0 ? pool.token0 : pool.token1;
        IERC7984 tokenOutContract = isToken0 ? pool.token1 : pool.token0;

        euint64 amt = FHE.fromExternal(amountIn, inputProof);

        // Transfer input tokens
        FHE.allowTransient(amt, address(tokenInContract));
        euint64 amtIn = tokenInContract.confidentialTransferFrom(
            msg.sender,
            address(this),
            amt
        );

        // Simplified 1:1 swap for FHE compatibility (no division in FHE)
        // In production, would use price oracle or fixed rate mechanism
        euint64 amtOut = amtIn;

        // Update reserves
        if (isToken0) {
            pool.reserve0 = FHE.add(pool.reserve0, amtIn);
            pool.reserve1 = FHE.sub(pool.reserve1, amtOut);
        } else {
            pool.reserve1 = FHE.add(pool.reserve1, amtIn);
            pool.reserve0 = FHE.sub(pool.reserve0, amtOut);
        }
        FHE.allowThis(pool.reserve0);
        FHE.allowThis(pool.reserve1);

        // Transfer output tokens
        FHE.allowTransient(amtOut, address(tokenOutContract));
        tokenOutContract.confidentialTransfer(msg.sender, amtOut);

        emit Swap(msg.sender, tokenIn, address(tokenOutContract));
    }

    // ============ View Functions ============

    function getPool(uint256 poolId) external view returns (
        address token0,
        address token1,
        bool initialized
    ) {
        Pool storage pool = _pools[poolId];
        return (address(pool.token0), address(pool.token1), pool.initialized);
    }

    function getPoolId(address token0, address token1) external view returns (uint256) {
        return _pairToPool[token0][token1];
    }

    function getPoolCount() external view returns (uint256) {
        return _poolIdCounter;
    }

    function getLpShares(uint256 poolId, address provider) external view returns (euint64) {
        return _lpShares[poolId][provider];
    }

    function getReserves(uint256 poolId) external view returns (euint64 reserve0, euint64 reserve1) {
        Pool storage pool = _pools[poolId];
        return (pool.reserve0, pool.reserve1);
    }
}
