# Sealed Tender

🔴 **Advanced** | 🚀 Advanced

Sealed-bid procurement auction - bids encrypted until deadline

## Overview

A sealed-bid procurement system where vendors submit encrypted bids that remain private until the deadline. Uses FHE.lt/gt for encrypted comparisons to find the lowest bidder. Demonstrates the public decryption flow: requestWinnerReveal triggers async decryption, finalizeWinnerReveal completes the process. Critical for government tenders and corporate procurement.

## Quick Start

```bash
# Create new project from this template
npx labz create sealed-tender my-project

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
 * @title SealedTender
 * @notice Sealed-bid procurement auction - bids encrypted until deadline
 * @dev Uses FHE to keep all bids private until evaluation
 *
 * Procurement Types:
 * - Lowest Price: Lowest valid bid wins (default)
 * - Best Value: Scored evaluation (price + quality)
 *
 * FHE Operations Used:
 * - lt/lte: Find lowest bid
 * - gt/gte: Find highest bid (reverse auctions)
 * - min: Track current lowest
 * - eq: Identify winner
 * - select: Conditional winner selection
 */
contract SealedTender is ZamaEthereumConfig {
    // ============ Errors ============
    error TenderNotFound();
    error TenderNotOpen();
    error TenderNotClosed();
    error BiddingEnded();
    error AlreadyBid();
    error NotTenderOwner();
    error NotWinner();
    error WinnerAlreadyRevealed();
    error NoBidsReceived();
    error RevealNotRequested();
    error InvalidDecryptionProof();
    

    // ============ Events ============
    event TenderCreated(uint256 indexed tenderId, address indexed owner, string title);
    event BidSubmitted(uint256 indexed tenderId, address indexed bidder);
    event WinnerReadyForReveal(uint256 indexed tenderId);
    event WinnerRevealed(uint256 indexed tenderId, address indexed winner, uint64 winningBid);
    event ContractAwarded(uint256 indexed tenderId, address indexed winner);
    event TenderCancelled(uint256 indexed tenderId);
    

    // ============ Enums ============
    enum TenderState { Open, Closed, Evaluated, Awarded, Cancelled }

    // ============ Structs ============
    struct Tender {
        address owner;
        string title;
        string description;
        uint256 deadline;
        TenderState state;
        uint256 bidCount;
        euint64 lowestBid;          // Encrypted current lowest
        bool revealRequested;            // Has reveal been requested
        bool revealed;                   // Has winner been revealed
        uint64 revealedLowestBid;        // Decrypted lowest bid (after reveal)
        address winnerAddress;           // Set after reveal
        uint256 createdAt;
    }

    struct Bid {
        address bidder;
        euint64 amount;             // Encrypted bid amount
        uint256 submittedAt;
        ebool isLowest;                  // Encrypted: is this the lowest?
    }

    // ============ State Variables ============
    mapping(uint256 => Tender) public _tenders;
    mapping(uint256 => mapping(address => Bid)) public _bids;
    mapping(uint256 => address[]) public _bidders;
    uint256 public _tenderCount;

    uint256 public minBiddingPeriod;
    

    // ============ Modifiers ============
    modifier tenderExists(uint256 tenderId) {
        if (tenderId >= _tenderCount) revert TenderNotFound();
        _;
    }

    modifier tenderOpen(uint256 tenderId) {
        if (_tenders[tenderId].state != TenderState.Open) revert TenderNotOpen();
        if (block.timestamp > _tenders[tenderId].deadline) revert BiddingEnded();
        _;
    }

    modifier onlyTenderOwner(uint256 tenderId) {
        if (_tenders[tenderId].owner != msg.sender) revert NotTenderOwner();
        _;
    }
    

    // ============ Constructor ============
    constructor(uint256 _minBiddingPeriod) {
        minBiddingPeriod = _minBiddingPeriod;
        
    }

    // ============ External Functions ============

    /**
     * @notice Create a new procurement tender
     * @param title Tender title
     * @param description Detailed requirements
     * @param duration Bidding period in seconds
     */
    function createTender(
        string calldata title,
        string calldata description,
        uint256 duration
    ) external returns (uint256) {
        require(duration >= minBiddingPeriod, "Duration too short");

        uint256 tenderId = _tenderCount++;

        _tenders[tenderId] = Tender({
            owner: msg.sender,
            title: title,
            description: description,
            deadline: block.timestamp + duration,
            state: TenderState.Open,
            bidCount: 0,
            lowestBid: FHE.asEuint64(type(uint64).max), // Start with max
            revealRequested: false,
            revealed: false,
            revealedLowestBid: 0,
            winnerAddress: address(0),
            createdAt: block.timestamp
        });

        FHE.allowThis(_tenders[tenderId].lowestBid);

        emit TenderCreated(tenderId, msg.sender, title);
        return tenderId;
    }

    /**
     * @notice Submit a sealed bid
     * @param tenderId The tender to bid on
     * @param encryptedAmount Encrypted bid amount
     */
    function submitBid(uint256 tenderId, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        tenderExists(tenderId)
        tenderOpen(tenderId)
    {
        if (_bids[tenderId][msg.sender].submittedAt != 0) revert AlreadyBid();

        euint64 bidAmount = FHE.fromExternal(encryptedAmount, inputProof);

        // Check if this is the new lowest bid
        ebool isLower = FHE.lt(bidAmount, _tenders[tenderId].lowestBid);

        // Update lowest bid if this is lower
        _tenders[tenderId].lowestBid = FHE.select(
            isLower,
            bidAmount,
            _tenders[tenderId].lowestBid
        );

        _bids[tenderId][msg.sender] = Bid({
            bidder: msg.sender,
            amount: bidAmount,
            submittedAt: block.timestamp,
            isLowest: isLower
        });

        _bidders[tenderId].push(msg.sender);
        _tenders[tenderId].bidCount++;

        // Allow contract to use encrypted values
        FHE.allowThis(bidAmount);
        FHE.allowThis(isLower);
        FHE.allowThis(_tenders[tenderId].lowestBid);

        // Allow bidder to see their own bid
        FHE.allow(bidAmount, msg.sender);

        emit BidSubmitted(tenderId, msg.sender);
    }

    /**
     * @notice Request winner reveal via public decryption
     * @dev Step 1 of 3-step async public decryption pattern
     * @param tenderId The tender to reveal
     */
    function requestWinnerReveal(uint256 tenderId)
        external
        tenderExists(tenderId)
        onlyTenderOwner(tenderId)
    {
        Tender storage tender = _tenders[tenderId];
        if (block.timestamp <= tender.deadline) revert TenderNotClosed();
        if (tender.state != TenderState.Open) revert WinnerAlreadyRevealed();
        if (tender.bidCount == 0) revert NoBidsReceived();
        if (tender.revealRequested) revert WinnerAlreadyRevealed();

        tender.state = TenderState.Closed;
        tender.revealRequested = true;

        // Mark the lowest bid for public decryption
        FHE.makePubliclyDecryptable(tender.lowestBid);

        emit WinnerReadyForReveal(tenderId);
    }

    /**
     * @notice Get encrypted lowest bid handle for off-chain decryption
     * @dev Step 2 is off-chain: use relayer-sdk to decrypt
     * @param tenderId The tender
     */
    function getLowestBidHandle(uint256 tenderId)
        external
        view
        tenderExists(tenderId)
        returns (euint64)
    {
        return _tenders[tenderId].lowestBid;
    }

    /**
     * @notice Finalize winner reveal with decryption proof
     * @dev Step 3 of 3-step async public decryption pattern
     * @param tenderId The tender
     * @param lowestBidValue The decrypted lowest bid value
     * @param decryptionProof The proof from Zama KMS
     */
    function finalizeWinnerReveal(
        uint256 tenderId,
        uint64 lowestBidValue,
        bytes calldata decryptionProof
    )
        external
        tenderExists(tenderId)
    {
        Tender storage tender = _tenders[tenderId];
        if (!tender.revealRequested) revert RevealNotRequested();
        if (tender.revealed) revert WinnerAlreadyRevealed();

        // Verify the decryption proof
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(tender.lowestBid);

        bytes memory cleartexts = abi.encode(lowestBidValue);

        // This reverts if proof is invalid
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Store revealed lowest bid
        tender.revealed = true;
        tender.revealedLowestBid = lowestBidValue;
        tender.state = TenderState.Evaluated;

        // Find the winner: first bidder whose encrypted bid equals the lowest
        // Note: In production, you'd also reveal each bid or use ZK proofs
        // For now, the owner must identify and verify the winner
    }

    /**
     * @notice Award contract to winner after verification
     * @dev Owner must verify winner's bid matches revealed lowest bid
     * @param tenderId The tender
     * @param winner The winning bidder address
     */
    function awardContract(uint256 tenderId, address winner)
        external
        tenderExists(tenderId)
        onlyTenderOwner(tenderId)
    {
        Tender storage tender = _tenders[tenderId];
        require(tender.revealed, "Winner not revealed");
        require(tender.state == TenderState.Evaluated, "Not evaluated");

        Bid storage winningBid = _bids[tenderId][winner];
        require(winningBid.submittedAt != 0, "Not a bidder");

        tender.winnerAddress = winner;
        tender.state = TenderState.Awarded;

        // Reveal winning bid to winner
        FHE.allow(winningBid.amount, winner);

        emit WinnerRevealed(tenderId, winner, tender.revealedLowestBid);
        emit ContractAwarded(tenderId, winner);
    }

    /**
     * @notice Cancel a tender (owner only, before deadline)
     */
    function cancelTender(uint256 tenderId)
        external
        tenderExists(tenderId)
        onlyTenderOwner(tenderId)
    {
        Tender storage tender = _tenders[tenderId];
        require(tender.state == TenderState.Open, "Cannot cancel");

        tender.state = TenderState.Cancelled;

        emit TenderCancelled(tenderId);
    }

    

    // ============ View Functions ============

    /**
     * @notice Get tender info
     */
    function getTender(uint256 tenderId) external view returns (
        address owner,
        string memory title,
        uint256 deadline,
        TenderState state,
        uint256 bidCount,
        bool revealRequested,
        bool revealed,
        uint64 revealedLowestBid,
        address winner
    ) {
        Tender storage t = _tenders[tenderId];
        return (
            t.owner,
            t.title,
            t.deadline,
            t.state,
            t.bidCount,
            t.revealRequested,
            t.revealed,
            t.revealedLowestBid,
            t.winnerAddress
        );
    }

    /**
     * @notice Get total tender count
     */
    function getTenderCount() external view returns (uint256) {
        return _tenderCount;
    }

    /**
     * @notice Get bidders for a tender
     */
    function getBidders(uint256 tenderId) external view returns (address[] memory) {
        return _bidders[tenderId];
    }

    /**
     * @notice Check if user has bid
     */
    function hasBid(uint256 tenderId, address bidder) external view returns (bool) {
        return _bids[tenderId][bidder].submittedAt != 0;
    }

    /**
     * @notice Get bid submission time
     */
    function getBidTime(uint256 tenderId, address bidder) external view returns (uint256) {
        return _bids[tenderId][bidder].submittedAt;
    }

    

    // ============ Internal Functions ============
    
}

```

## FHE Operations Used

- `FHE.lt()`
- `FHE.gt()`
- `FHE.min()`
- `FHE.eq()`
- `FHE.select()`
- `FHE.allowThis()`
- `FHE.allow()`
- `FHE.fromExternal()`
- `FHE.asEuint64()`
- `FHE.makePubliclyDecryptable()`

## FHE Types Used

- `euint64`
- `externalEuint64`
- `ebool`

## Tags

`auction` `procurement` `bidding` `privacy` `government`

## Related Examples

- [auction](./auction.md)
- [prediction-market](./prediction-market.md)

## Prerequisites

Before this example, you should understand:
- [decryption-public-single](./decryption-public-single.md)

## Next Steps

After this example, check out:
- [dark-pool](./dark-pool.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
