# Vesting Wallet with ERC7984

🟡 **Intermediate** | 🏗️ OpenZeppelin Contracts

A confidential token vesting wallet with cliff-based release schedule

## Overview

This example implements a vesting wallet that releases ERC7984 tokens according to a cliff schedule. The vested amounts remain encrypted, preserving privacy of the vesting arrangement. Beneficiaries can release tokens after the vesting period ends.

## Quick Start

```bash
# Create new project from this template
npx labz create vesting-wallet my-project

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

import {FHE, ebool, euint64, euint128} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// @title VestingWalletExample - Confidential Token Vesting
/// @notice A vesting wallet that releases ERC7984 tokens according to a linear schedule
/// @dev Vested amounts remain encrypted, preserving privacy of the vesting arrangement
contract VestingWalletExample is Ownable, ReentrancyGuard, ZamaEthereumConfig {

    // ============ Errors ============

    /// @dev Vesting has not started yet
    error VestingNotStarted();

    /// @dev No tokens available to release
    error NothingToRelease();

    // ============ Events ============

    /// @notice Emitted when vested tokens are released
    event TokensReleased(address indexed token, euint64 amount);

    /// @notice Emitted when vesting schedule is updated
    event VestingScheduleSet(uint64 start, uint64 duration);

    // ============ State ============

    /// @dev Amount of each token already released (encrypted)
    mapping(address token => euint128 released) private _tokenReleased;

    /// @dev Vesting start timestamp
    uint64 private _start;

    /// @dev Vesting duration in seconds
    uint64 private _duration;

    // ============ Constructor ============

    /// @param beneficiaryAddress The address that will receive vested tokens
    /// @param startTimestamp When vesting begins
    /// @param durationSeconds How long the vesting period lasts
    constructor(
        address beneficiaryAddress,
        uint64 startTimestamp,
        uint64 durationSeconds
    ) Ownable(beneficiaryAddress) {
        _start = startTimestamp;
        _duration = durationSeconds;

        emit VestingScheduleSet(startTimestamp, durationSeconds);
    }

    // ============ Vesting Schedule ============

    /// @notice Get the vesting start timestamp
    function start() public view returns (uint64) {
        return _start;
    }

    /// @notice Get the vesting duration
    function duration() public view returns (uint64) {
        return _duration;
    }

    /// @notice Get the vesting end timestamp
    function end() public view returns (uint64) {
        return _start + _duration;
    }

    /// @notice Get the amount already released for a token
    function released(address token) public view returns (euint128) {
        return _tokenReleased[token];
    }

    // ============ Release Functions ============

    /// @notice Calculate releasable amount for a token
    /// @param token The ERC7984 token address
    /// @return The encrypted releasable amount
    function releasable(address token) public returns (euint64) {
        euint128 vested = vestedAmount(token, uint64(block.timestamp));
        euint128 alreadyReleased = released(token);

        // releasable = vested - released (if vested >= released, else 0)
        ebool canRelease = FHE.ge(vested, alreadyReleased);
        euint128 diff = FHE.sub(vested, alreadyReleased);

        return FHE.select(canRelease, FHE.asEuint64(diff), FHE.asEuint64(0));
    }

    /// @notice Release vested tokens to the beneficiary
    /// @param token The ERC7984 token to release
    function release(address token) external nonReentrant {
        if (block.timestamp < _start) revert VestingNotStarted();

        euint64 amount = releasable(token);

        // Transfer to beneficiary
        FHE.allowTransient(amount, token);
        euint64 amountSent = IERC7984(token).confidentialTransfer(owner(), amount);

        // Update released amount
        euint128 newReleased = FHE.add(released(token), amountSent);
        FHE.allow(newReleased, owner());
        FHE.allowThis(newReleased);
        _tokenReleased[token] = newReleased;

        emit TokensReleased(token, amountSent);
    }

    // ============ Vesting Calculation ============

    /// @notice Calculate the vested amount at a given timestamp
    /// @param token The token address
    /// @param timestamp The timestamp to calculate for
    /// @return The encrypted vested amount
    function vestedAmount(address token, uint64 timestamp) public returns (euint128) {
        // Total allocation = released + current balance
        euint128 totalAllocation = FHE.add(
            released(token),
            IERC7984(token).confidentialBalanceOf(address(this))
        );

        return _vestingSchedule(totalAllocation, timestamp);
    }

    /// @notice Cliff vesting schedule calculation
    /// @param totalAllocation Total tokens allocated for vesting
    /// @param timestamp Current timestamp
    /// @return Vested amount (0 before cliff, 100% after)
    /// @dev Uses cliff vesting since FHE doesn't support division for linear vesting
    function _vestingSchedule(
        euint128 totalAllocation,
        uint64 timestamp
    ) internal view returns (euint128) {
        if (timestamp < _start + _duration) {
            // Before cliff: 0 vested
            return euint128.wrap(0);
        } else {
            // After cliff: 100% vested
            return totalAllocation;
        }
    }

    // ============ View Functions ============

    /// @notice Get the beneficiary address
    function beneficiary() external view returns (address) {
        return owner();
    }

    /// @notice Calculate vesting progress percentage (0-100)
    function vestingProgress() external view returns (uint256) {
        if (block.timestamp < _start) return 0;
        if (block.timestamp >= end()) return 100;

        uint256 elapsed = block.timestamp - _start;
        return (elapsed * 100) / _duration;
    }

    /// @notice Check if vesting has started
    function hasStarted() external view returns (bool) {
        return block.timestamp >= _start;
    }

    /// @notice Check if vesting has ended
    function hasEnded() external view returns (bool) {
        return block.timestamp >= end();
    }
}

```

## Code Explanation

### Constructor

Initialize vesting with beneficiary address, start timestamp, and duration.

*Lines 47-56*

### Release

Release vested tokens to the beneficiary. Transfers releasable amount.

*Lines 98-114*

### Releasable

Calculate the amount of tokens available for release (vested minus already released).

*Lines 85-94*

### Vested Amount

Calculate total vested amount at a given timestamp based on cliff schedule.

*Lines 122-130*

### Vesting Schedule

Cliff vesting schedule: 0% before cliff, 100% after. Uses cliff since FHE doesn't support division.

*Lines 137-148*

## FHE Operations Used

- `FHE.confidentialTransfer()`
- `FHE.confidentialBalanceOf()`
- `FHE.FHE.add()`
- `FHE.FHE.sub()`
- `FHE.FHE.ge()`
- `FHE.FHE.select()`
- `FHE.FHE.asEuint64()`
- `FHE.FHE.allow()`
- `FHE.FHE.allowThis()`
- `FHE.FHE.allowTransient()`

## FHE Types Used

- `euint64`
- `euint128`
- `ebool`

## Tags

`vesting` `wallet` `ERC7984` `schedule` `tokens` `OpenZeppelin`

## Related Examples

- [erc7984-token](./erc7984-token.md)

## Prerequisites

Before this example, you should understand:
- [erc7984-token](./erc7984-token.md)

## Next Steps

After this example, check out:
- [escrow-erc7984](./escrow-erc7984.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
