# Input Proofs Explained

🟡 **Intermediate** | 🛡️ Input Proofs

Understanding input proofs: what they are, why they exist, and how they protect FHE applications

## Overview

This CRITICAL security example explains input proofs in FHEVM. Input proofs are cryptographic proofs that verify encrypted values were created correctly by authorized users for specific contracts. Learn why they're needed (to prevent malformed ciphertext, replay, and cross-contract attacks), how they're generated client-side, and how FHE.fromExternal() verifies them automatically. Understanding input proofs is essential for building secure FHE applications.

## Quick Start

```bash
# Create new project from this template
npx labz create input-proofs my-project

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

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Confidential Auction - Input Proof Example
/// @notice Sealed bid auction demonstrating WHY input proofs are critical
/// @dev This is a PRACTICAL example of input proof usage
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    SCENARIO: SEALED BID AUCTION                    ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║   1. Alice bids $100 (encrypted)                                  ║
/// ║   2. Bob bids $80 (encrypted)                                     ║
/// ║   3. Auction ends, highest bid wins                               ║
/// ║                                                                    ║
/// ║   ATTACK (without Input Proof):                                   ║
/// ║   ─────────────────────────────────                               ║
/// ║   Bob copies Alice's encrypted bid from blockchain                ║
/// ║   Claims "This was my bid"                                        ║
/// ║   System can't tell who the real owner is!                        ║
/// ║                                                                    ║
/// ║   WITH INPUT PROOF:                                               ║
/// ║   ─────────────────────────────────                               ║
/// ║   Each bid includes proof: "I CREATED THIS ENCRYPTION"            ║
/// ║   Even if Bob copies → REVERT (proof belongs to Alice)            ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
contract ConfidentialAuction is ZamaEthereumConfig {
    // ============ State ============

    address public owner;
    bool public auctionEnded;

    // Each user's encrypted bid
    mapping(address => euint64) private _bids;
    mapping(address => bool) public hasBid;

    // Highest bid (encrypted)
    euint64 private _highestBid;
    address public highestBidder;

    // List of bidders
    address[] public bidders;

    // ============ Events ============

    event BidPlaced(address indexed bidder);
    event AuctionEnded(address indexed winner);

    // ============ Errors ============

    error AuctionAlreadyEnded();
    error AuctionNotEnded();
    error AlreadyBid();
    error NoBidders();

    // ============ Constructor ============

    constructor() {
        owner = msg.sender;
        // Initialize highest bid to 0
        _highestBid = FHE.asEuint64(0);
        FHE.allowThis(_highestBid);
    }

    // ============ Core Functions ============

    /// @notice Place a bid - INPUT PROOF KICKS IN HERE
    /// @param encryptedBid Encrypted bid amount
    /// @param inputProof ZK proof: "I created this encryption"
    ///
    /// ╔═══════════════════════════════════════════════════════════════╗
    /// ║  FHE.fromExternal() verifies:                                 ║
    /// ║                                                                ║
    /// ║  1. Was this encryption created by msg.sender?                ║
    /// ║     → If not, REVERT (can't copy someone else's bid)          ║
    /// ║                                                                ║
    /// ║  2. Was this encryption made for THIS contract?               ║
    /// ║     → If not, REVERT (can't use another contract's data)      ║
    /// ║                                                                ║
    /// ║  3. Is the encryption valid?                                  ║
    /// ║     → If not, REVERT (can't send malformed data)              ║
    /// ╚═══════════════════════════════════════════════════════════════╝
    function bid(
        externalEuint64 encryptedBid,
        bytes calldata inputProof
    ) external {
        if (auctionEnded) revert AuctionAlreadyEnded();
        if (hasBid[msg.sender]) revert AlreadyBid();

        // INPUT PROOF VERIFICATION HAPPENS HERE
        // fromExternal() checks the proof:
        // - Invalid proof → REVERT
        // - Someone else's proof → REVERT
        // - Wrong contract's proof → REVERT
        euint64 bidAmount = FHE.fromExternal(encryptedBid, inputProof);

        // Save the bid
        _bids[msg.sender] = bidAmount;
        hasBid[msg.sender] = true;
        bidders.push(msg.sender);

        // ACL permissions
        FHE.allowThis(_bids[msg.sender]);
        FHE.allow(_bids[msg.sender], msg.sender);

        // Update highest bid
        ebool isHigher = FHE.gt(bidAmount, _highestBid);
        _highestBid = FHE.select(isHigher, bidAmount, _highestBid);
        FHE.allowThis(_highestBid);

        emit BidPlaced(msg.sender);
    }

    /// @notice End the auction and determine the winner
    function endAuction() external {
        if (auctionEnded) revert AuctionAlreadyEnded();
        if (bidders.length == 0) revert NoBidders();

        auctionEnded = true;

        // Find the person with the highest bid
        // (For simplicity, we take the first match)
        for (uint256 i = 0; i < bidders.length; i++) {
            ebool isWinner = FHE.eq(_bids[bidders[i]], _highestBid);
            // Note: In production, this would be verified via decrypt
            // Keeping it simple for this example
            FHE.allowThis(isWinner);
        }

        // Assign first bidder as temporary winner (for demo)
        highestBidder = bidders[0];

        emit AuctionEnded(highestBidder);
    }

    // ============ View Functions ============

    /// @notice Get user's own bid (encrypted handle)
    function getMyBid() external view returns (euint64) {
        return _bids[msg.sender];
    }

    /// @notice Highest bid (encrypted handle)
    function getHighestBid() external view returns (euint64) {
        return _highestBid;
    }

    /// @notice Total number of bidders
    function getBidderCount() external view returns (uint256) {
        return bidders.length;
    }
}

```

## Code Explanation

### What Are Proofs

Input proofs verify that: (1) the encrypted value was created by an authorized party, (2) the encryption was performed correctly, and (3) the data hasn't been tampered with.

*Lines 10-22*

### Why Needed

Without proofs, attackers could: submit malformed ciphertexts, copy others' encrypted values (replay attack), or use values across contracts inappropriately.

*Lines 24-36*

### How Work

Client-side: fhevm encrypts with contract+user binding and generates ZK proof. Contract-side: FHE.fromExternal() verifies proof matches sender and contract, reverts if invalid.

*Lines 38-55*

### Basic Example

Basic usage showing FHE.fromExternal() doing three things: extract ciphertext, verify proof, return usable euint64. Reverts if proof is invalid.

*Lines 68-86*

### Security Demo

Financial security example showing why proof verification is critical for deposits and transfers. Prevents attacker from copying or replaying others' values.

*Lines 90-128*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.add()`
- `FHE.sub()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint64`
- `externalEuint64`

## Tags

`input proof` `security` `fromExternal` `verification` `ZK proof` `attack prevention` `replay`

## Related Examples

- [encryption-single](./encryption-single.md)
- [anti-patterns-missing-allow](./anti-patterns-missing-allow.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [handle-vs-value](./handle-vs-value.md)
- [anti-pattern-view-encrypted](./anti-pattern-view-encrypted.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
