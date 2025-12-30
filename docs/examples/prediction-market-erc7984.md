# Prediction Market with ERC7984

🔴 **Advanced** | 🏗️ OpenZeppelin Contracts

A confidential prediction market where bet amounts stay private

## Overview

This advanced example implements a binary prediction market (YES/NO outcomes) using ERC7984 tokens. Bettors can place encrypted bets on market outcomes while keeping their bet amounts private. The market owner can create markets, close betting, and resolve outcomes.

## Quick Start

```bash
# Create new project from this template
npx labz create prediction-market-erc7984 my-project

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

import {FHE, externalEuint64, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PredictionMarketERC7984 - Confidential Prediction Market
/// @notice A prediction market where bets are placed with ERC7984 tokens and amounts stay private
/// @dev Supports binary outcomes (YES/NO) with encrypted bet amounts
contract PredictionMarketERC7984 is ZamaEthereumConfig, Ownable, ReentrancyGuard {

    // ============ Errors ============

    error MarketNotFound();
    error MarketNotOpen();
    error MarketNotResolved();
    error MarketAlreadyResolved();
    error AlreadyClaimed();
    error NotOperator();
    error InvalidOutcome();

    // ============ Events ============

    event MarketCreated(uint256 indexed marketId, string description);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bool isYes);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed bettor);

    // ============ Types ============

    enum MarketState {
        Open,
        Closed,
        Resolved
    }

    struct Market {
        string description;
        IERC7984 bettingToken;
        euint64 totalYesBets;
        euint64 totalNoBets;
        uint256 endTime;
        MarketState state;
        bool outcome; // true = YES won, false = NO won
    }

    struct UserBet {
        euint64 yesAmount;
        euint64 noAmount;
        bool claimed;
    }

    // ============ State ============

    /// @dev Market ID counter
    uint256 private _marketIdCounter;

    /// @dev Mapping of market ID to market data
    mapping(uint256 => Market) private _markets;

    /// @dev Mapping of market ID => user => bet data
    mapping(uint256 => mapping(address => UserBet)) private _userBets;

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Market Management ============

    /// @notice Create a new prediction market
    /// @param description Market description/question
    /// @param bettingToken The ERC7984 token for betting
    /// @param durationSeconds How long betting is open
    /// @return marketId The new market ID
    function createMarket(
        string calldata description,
        IERC7984 bettingToken,
        uint256 durationSeconds
    ) external onlyOwner returns (uint256 marketId) {
        marketId = _marketIdCounter++;

        _markets[marketId] = Market({
            description: description,
            bettingToken: bettingToken,
            totalYesBets: euint64.wrap(0),
            totalNoBets: euint64.wrap(0),
            endTime: block.timestamp + durationSeconds,
            state: MarketState.Open,
            outcome: false
        });

        emit MarketCreated(marketId, description);
    }

    /// @notice Close betting for a market
    /// @param marketId The market ID
    function closeMarket(uint256 marketId) external onlyOwner {
        Market storage market = _markets[marketId];
        if (address(market.bettingToken) == address(0)) revert MarketNotFound();
        if (market.state != MarketState.Open) revert MarketNotOpen();

        market.state = MarketState.Closed;
    }

    /// @notice Resolve a market with the outcome
    /// @param marketId The market ID
    /// @param outcome True if YES wins, false if NO wins
    function resolveMarket(uint256 marketId, bool outcome) external onlyOwner {
        Market storage market = _markets[marketId];
        if (address(market.bettingToken) == address(0)) revert MarketNotFound();
        if (market.state == MarketState.Resolved) revert MarketAlreadyResolved();

        market.state = MarketState.Resolved;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    // ============ Betting Functions ============

    /// @notice Place a bet on a market
    /// @param marketId The market ID
    /// @param isYes True to bet YES, false to bet NO
    /// @param amount Encrypted bet amount
    /// @param inputProof Proof for the encrypted input
    function placeBet(
        uint256 marketId,
        bool isYes,
        externalEuint64 amount,
        bytes calldata inputProof
    ) external nonReentrant {
        Market storage market = _markets[marketId];
        if (address(market.bettingToken) == address(0)) revert MarketNotFound();
        if (market.state != MarketState.Open) revert MarketNotOpen();
        if (block.timestamp > market.endTime) revert MarketNotOpen();

        // Verify operator
        if (!market.bettingToken.isOperator(msg.sender, address(this))) {
            revert NotOperator();
        }

        euint64 betAmount = FHE.fromExternal(amount, inputProof);

        // Transfer bet to contract
        FHE.allowTransient(betAmount, address(market.bettingToken));
        euint64 transferred = market.bettingToken.confidentialTransferFrom(
            msg.sender,
            address(this),
            betAmount
        );

        // Update market totals
        if (isYes) {
            market.totalYesBets = FHE.add(market.totalYesBets, transferred);
            _userBets[marketId][msg.sender].yesAmount = FHE.add(
                _userBets[marketId][msg.sender].yesAmount,
                transferred
            );
            FHE.allowThis(market.totalYesBets);
        } else {
            market.totalNoBets = FHE.add(market.totalNoBets, transferred);
            _userBets[marketId][msg.sender].noAmount = FHE.add(
                _userBets[marketId][msg.sender].noAmount,
                transferred
            );
            FHE.allowThis(market.totalNoBets);
        }

        // Allow user to see their bets
        FHE.allowThis(_userBets[marketId][msg.sender].yesAmount);
        FHE.allowThis(_userBets[marketId][msg.sender].noAmount);
        FHE.allow(_userBets[marketId][msg.sender].yesAmount, msg.sender);
        FHE.allow(_userBets[marketId][msg.sender].noAmount, msg.sender);

        emit BetPlaced(marketId, msg.sender, isYes);
    }

    // ============ Claim Functions ============

    /// @notice Claim winnings from a resolved market
    /// @param marketId The market ID
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = _markets[marketId];
        if (address(market.bettingToken) == address(0)) revert MarketNotFound();
        if (market.state != MarketState.Resolved) revert MarketNotResolved();

        UserBet storage userBet = _userBets[marketId][msg.sender];
        if (userBet.claimed) revert AlreadyClaimed();

        userBet.claimed = true;

        // Calculate winnings based on outcome
        // Simplified: winner gets back their original bet (in production, would implement proportional sharing)
        euint64 userWinningBet = market.outcome ? userBet.yesAmount : userBet.noAmount;
        euint64 payout = userWinningBet;

        // Transfer winnings
        FHE.allowTransient(payout, address(market.bettingToken));
        market.bettingToken.confidentialTransfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender);
    }

    // ============ View Functions ============

    function getMarket(uint256 marketId) external view returns (
        string memory description,
        address bettingToken,
        uint256 endTime,
        MarketState state,
        bool outcome
    ) {
        Market storage market = _markets[marketId];
        return (
            market.description,
            address(market.bettingToken),
            market.endTime,
            market.state,
            market.outcome
        );
    }

    function getMarketCount() external view returns (uint256) {
        return _marketIdCounter;
    }

    function getUserBet(uint256 marketId, address user) external view returns (
        euint64 yesAmount,
        euint64 noAmount,
        bool claimed
    ) {
        UserBet storage bet = _userBets[marketId][user];
        return (bet.yesAmount, bet.noAmount, bet.claimed);
    }

    function getMarketTotals(uint256 marketId) external view returns (
        euint64 totalYes,
        euint64 totalNo
    ) {
        Market storage market = _markets[marketId];
        return (market.totalYesBets, market.totalNoBets);
    }
}

```

## Code Explanation

### Create Market

Create a new prediction market with description, betting token, and duration.

*Lines 78-96*

### Place Bet

Place an encrypted bet on YES or NO outcome. The bet amount is kept private.

*Lines 129-179*

### Resolve Market

Owner resolves the market by declaring the winning outcome (YES or NO).

*Lines 111-120*

### Claim Winnings

Winners claim their encrypted payouts after market resolution.

*Lines 185-205*

### Close Market

Close betting on a market before resolution.

*Lines 100-106*

## FHE Operations Used

- `FHE.confidentialTransferFrom()`
- `FHE.confidentialTransfer()`
- `FHE.FHE.add()`
- `FHE.FHE.allowTransient()`
- `FHE.FHE.allowThis()`
- `FHE.FHE.allow()`
- `FHE.fromExternal()`

## FHE Types Used

- `euint64`
- `ebool`

## Tags

`prediction` `betting` `market` `ERC7984` `oracle` `OpenZeppelin`

## Related Examples

- [erc7984-token](./erc7984-token.md)
- [lottery-erc7984](./lottery-erc7984.md)

## Prerequisites

Before this example, you should understand:
- [erc7984-token](./erc7984-token.md)

## Next Steps

After this example, check out:
- [lottery-erc7984](./lottery-erc7984.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
