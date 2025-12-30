# Prediction Market

🔴 **Advanced** | 🚀 Advanced

Polymarket-style prediction market with encrypted positions and private bet amounts

## Overview

A fully-featured prediction market where users can bet on binary outcomes (YES/NO) with encrypted amounts. Uses FHE for private bet positions - no one can see how much others are betting. After market resolution, pools are decrypted to calculate proportional payouts. Demonstrates complex FHE patterns: encrypted pools, oracle integration, and payout calculations with mixed encrypted/plaintext operations.

## Quick Start

```bash
# Create new project from this template
npx labz create prediction-market my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, euint8, ebool, eaddress, externalEuint64, externalEuint8, externalEbool, externalEaddress } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";


/**
 * @title PredictionMarket
 * @notice Polymarket-style prediction market with encrypted positions
 * @dev Uses FHE for private bet amounts - pools decrypted after resolution for payout calc
 */
contract PredictionMarket is ZamaEthereumConfig {
    // ============ Errors ============
    error MarketNotFound();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error InvalidOutcome();
    error NoBetPlaced();
    error AlreadyClaimed();
    error PoolsNotDecrypted();

    // ============ Events ============
    event MarketCreated(uint256 indexed marketId, string question, uint256 deadline);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bool outcome);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event PoolsDecrypted(uint256 indexed marketId, uint256 yesPool, uint256 noPool);
    event WinningsClaimed(uint256 indexed marketId, address indexed winner);

    // ============ Structs ============
    struct Market {
        string question;
        uint256 deadline;
        bool resolved;
        bool outcome;
        euint64 yesPool;
        euint64 noPool;
        uint256 yesCount;
        uint256 noCount;
        uint256 decryptedYesPool;
        uint256 decryptedNoPool;
        bool poolsDecrypted;
    }

    struct Position {
        euint64 yesAmount;
        euint64 noAmount;
        bool claimed;
    }

    // ============ State Variables ============
    mapping(uint256 => Market) public _markets;
    mapping(uint256 => mapping(address => Position)) public _positions;
    uint256 public _marketCount;
    address public oracle;
    uint256 public minBetAmount;

    // ============ Modifiers ============
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }

    modifier marketExists(uint256 marketId) {
        if (marketId >= _marketCount) revert MarketNotFound();
        _;
    }

    modifier marketOpen(uint256 marketId) {
        if (_markets[marketId].resolved) revert MarketAlreadyResolved();
        if (block.timestamp > _markets[marketId].deadline) revert MarketAlreadyResolved();
        _;
    }

    // ============ Constructor ============
    constructor(address _oracle, uint256 _minBetAmount) {
        oracle = _oracle;
        minBetAmount = _minBetAmount;
    }

    // ============ External Functions ============
    function createMarket(string calldata question, uint256 deadline) external returns (uint256) {
        require(deadline > block.timestamp, "Deadline must be future");
        uint256 marketId = _marketCount++;
        Market storage market = _markets[marketId];
        market.question = question;
        market.deadline = deadline;
        market.yesPool = FHE.asEuint64(0);
        market.noPool = FHE.asEuint64(0);
        FHE.allowThis(market.yesPool);
        FHE.allowThis(market.noPool);
        emit MarketCreated(marketId, question, deadline);
        return marketId;
    }

    function placeBet(
        uint256 marketId,
        bool outcome,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external marketExists(marketId) marketOpen(marketId) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        Position storage pos = _positions[marketId][msg.sender];
        if (outcome) {
            pos.yesAmount = FHE.add(pos.yesAmount, amount);
            _markets[marketId].yesPool = FHE.add(_markets[marketId].yesPool, amount);
            _markets[marketId].yesCount++;
        } else {
            pos.noAmount = FHE.add(pos.noAmount, amount);
            _markets[marketId].noPool = FHE.add(_markets[marketId].noPool, amount);
            _markets[marketId].noCount++;
        }
        FHE.allowThis(pos.yesAmount);
        FHE.allowThis(pos.noAmount);
        FHE.allowThis(_markets[marketId].yesPool);
        FHE.allowThis(_markets[marketId].noPool);
        FHE.allow(pos.yesAmount, msg.sender);
        FHE.allow(pos.noAmount, msg.sender);
        emit BetPlaced(marketId, msg.sender, outcome);
    }

    function resolveMarket(uint256 marketId, bool outcome) external onlyOracle marketExists(marketId) {
        Market storage market = _markets[marketId];
        if (market.resolved) revert MarketAlreadyResolved();
        require(block.timestamp > market.deadline, "Deadline not passed");
        market.resolved = true;
        market.outcome = outcome;
        FHE.allow(market.yesPool, oracle);
        FHE.allow(market.noPool, oracle);
        emit MarketResolved(marketId, outcome);
    }

    function setDecryptedPools(uint256 marketId, uint256 yesPool, uint256 noPool) external onlyOracle marketExists(marketId) {
        Market storage market = _markets[marketId];
        require(market.resolved, "Market not resolved");
        require(!market.poolsDecrypted, "Already decrypted");
        market.decryptedYesPool = yesPool;
        market.decryptedNoPool = noPool;
        market.poolsDecrypted = true;
        emit PoolsDecrypted(marketId, yesPool, noPool);
    }

    function claimWinnings(uint256 marketId) external marketExists(marketId) returns (euint64) {
        Market storage market = _markets[marketId];
        if (!market.resolved) revert MarketNotResolved();
        if (!market.poolsDecrypted) revert PoolsNotDecrypted();
        Position storage pos = _positions[marketId][msg.sender];
        if (pos.claimed) revert AlreadyClaimed();

        euint64 userBet;
        uint256 winningPoolDecrypted;
        uint256 totalPoolDecrypted = market.decryptedYesPool + market.decryptedNoPool;

        if (market.outcome) {
            userBet = pos.yesAmount;
            winningPoolDecrypted = market.decryptedYesPool;
        } else {
            userBet = pos.noAmount;
            winningPoolDecrypted = market.decryptedNoPool;
        }

        // FHE.div requires plaintext divisor - using decrypted pool value
        euint64 numerator = FHE.mul(userBet, uint64(totalPoolDecrypted));
        euint64 payout = FHE.div(numerator, uint64(winningPoolDecrypted));

        pos.claimed = true;
        FHE.allow(payout, msg.sender);
        FHE.allowThis(payout);
        emit WinningsClaimed(marketId, msg.sender);
        return payout;
    }

    // ============ View Functions ============
    function getMarket(uint256 marketId) external view returns (
        string memory question,
        uint256 deadline,
        bool resolved,
        bool outcome,
        uint256 yesCount,
        uint256 noCount,
        bool poolsDecrypted
    ) {
        Market storage market = _markets[marketId];
        return (market.question, market.deadline, market.resolved, market.outcome, market.yesCount, market.noCount, market.poolsDecrypted);
    }

    function getMarketCount() external view returns (uint256) {
        return _marketCount;
    }

    function hasClaimed(uint256 marketId, address user) external view returns (bool) {
        return _positions[marketId][user].claimed;
    }

    function getDecryptedPools(uint256 marketId) external view returns (uint256 yesPool, uint256 noPool) {
        Market storage market = _markets[marketId];
        require(market.poolsDecrypted, "Pools not decrypted");
        return (market.decryptedYesPool, market.decryptedNoPool);
    }
}

```

## Code Explanation

### Market Struct

Market stores encrypted YES/NO pools as euint64. Pool values remain private during betting. decryptedYesPool/decryptedNoPool are set by oracle after resolution for payout calculation.

*Lines 31-43*

### Place Bet

Users bet with encrypted amounts. FHE.add accumulates bets in encrypted pools. Both contract (allowThis) and user (allow) get permissions for their position amounts.

*Lines 96-120*

### Claim Winnings

Payout calculation uses mixed FHE: encrypted user bet multiplied by plaintext total pool, divided by plaintext winning pool. Result is encrypted payout amount.

*Lines 143-171*

## FHE Operations Used

- `FHE.add()`
- `FHE.sub()`
- `FHE.mul()`
- `FHE.div()`
- `FHE.asEuint64()`
- `FHE.fromExternal()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint64`
- `externalEuint64`
- `ebool`

## Tags

`defi` `prediction` `betting` `privacy` `polymarket` `oracle`

## Related Examples

- [sealed-tender](./sealed-tender.md)
- [dark-pool](./dark-pool.md)
- [voting](./voting.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)
- [acl-allow](./acl-allow.md)

## Next Steps

After this example, check out:
- [quadratic-vote](./quadratic-vote.md)
- [lottery](./lottery.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
