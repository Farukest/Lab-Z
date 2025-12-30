# Blind Auction

🟡 **Intermediate** | 🚀 Advanced

Blind auction where bids remain encrypted until reveal

## Overview

A blind auction system where all bids are encrypted during the bidding phase. Uses FHE.gt for encrypted comparisons to track the highest bid without revealing actual values. Winner determination uses public decryption flow. Perfect for NFT auctions and fair price discovery.

## Quick Start

```bash
# Create new project from this template
npx labz create auction my-project

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

/// @title Auction - Sealed Bid Auction
/// @notice Encrypted auction where bids remain private until the auction ends
/// @dev Generated with Lab-Z Composable Templates
contract Auction is ZamaEthereumConfig {

    // ============ Errors ============

    /// @dev Auction has already ended
    error AuctionEnded();
    /// @dev Auction has not ended yet
    error AuctionNotEnded();
    /// @dev Auction already finalized
    error AuctionAlreadyFinalized();
    /// @dev User has already placed a bid
    error AlreadyBid(address bidder);
    /// @dev No bids were placed
    error NoBids();
    /// @dev Winner reveal not requested yet
    error RevealNotRequested();
    /// @dev Winner already revealed
    error AlreadyRevealed();
    /// @dev Invalid decryption proof
    error InvalidDecryptionProof();


    // ============ Events ============

    /// @notice Emitted when a bid is placed (amount is encrypted)
    event BidPlaced(address indexed bidder);
    /// @notice Emitted when winner reveal is ready for decryption
    event WinnerReadyForReveal();
    /// @notice Emitted when winner is revealed
    event WinnerRevealed(address indexed winner);
    /// @notice Emitted when auction ends (after winner claimed)
    event AuctionFinalized(address indexed winner);


    // ============ State Variables ============

    /// @dev Auction item description
    string private _itemDescription;

    /// @dev When the auction ends
    uint256 private _auctionEndTime;

    /// @dev Encrypted highest bid
    euint64 private _highestBid;

    /// @dev Encrypted highest bidder address
    eaddress private _highestBidder;

    /// @dev Track encrypted bids per address
    mapping(address => euint64) private _bids;

    /// @dev Track if address has bid
    mapping(address => bool) private _hasBid;

    /// @dev Number of bidders
    uint256 private _bidderCount;

    /// @dev Whether auction is finalized
    bool private _finalized;

    /// @dev Whether reveal has been requested
    bool private _revealRequested;

    /// @dev Whether winner has been revealed
    bool private _revealed;

    /// @dev Winner address (set after finalization)
    address private _winner;



    // ============ Modifiers ============

    /// @dev Ensures auction is still active
    modifier onlyDuringAuction() {
        if (block.timestamp > _auctionEndTime) {
            revert AuctionEnded();
        }
        _;
    }

    /// @dev Ensures auction has ended
    modifier onlyAfterAuction() {
        if (block.timestamp <= _auctionEndTime) {
            revert AuctionNotEnded();
        }
        _;
    }



    // ============ Constructor ============

    constructor(
        string memory itemDescription,
        uint256 durationSeconds
    ) {
        _itemDescription = itemDescription;
        _auctionEndTime = block.timestamp + durationSeconds;
        _highestBid = FHE.asEuint64(0);
        _highestBidder = FHE.asEaddress(address(0));

        FHE.allowThis(_highestBid);
        FHE.allowThis(_highestBidder);

    }

    // ============ External Functions ============

    /// @notice Place an encrypted bid
    /// @param encryptedBid Encrypted bid amount
    /// @param inputProof Zero-knowledge proof for the input
    function bid(
        externalEuint64 encryptedBid,
        bytes calldata inputProof
    ) external onlyDuringAuction  {


        if (_hasBid[msg.sender]) {
            revert AlreadyBid(msg.sender);
        }

        // Convert external input to internal encrypted value
        euint64 bidAmount = FHE.fromExternal(encryptedBid, inputProof);

        // Store the bid
        _bids[msg.sender] = bidAmount;
        _hasBid[msg.sender] = true;
        _bidderCount++;

        // Compare with current highest (encrypted comparison)
        ebool isHigher = FHE.gt(bidAmount, _highestBid);

        // Update highest bid if this bid is higher
        _highestBid = FHE.select(isHigher, bidAmount, _highestBid);
        _highestBidder = FHE.select(isHigher, FHE.asEaddress(msg.sender), _highestBidder);



        // Set ACL permissions
        FHE.allowThis(_bids[msg.sender]);
        FHE.allowThis(_highestBid);
        FHE.allowThis(_highestBidder);
        FHE.allow(_bids[msg.sender], msg.sender);


        emit BidPlaced(msg.sender);
    }

    /// @notice Request winner reveal via public decryption
    /// @dev Step 1 of 3-step async public decryption pattern
    function requestWinnerReveal() external onlyAfterAuction {
        if (_revealRequested) revert AlreadyRevealed();
        if (_bidderCount == 0) revert NoBids();

        _revealRequested = true;

        // Mark the encrypted winner address for public decryption
        FHE.makePubliclyDecryptable(_highestBidder);

        emit WinnerReadyForReveal();
    }

    /// @notice Get encrypted winner handle for off-chain decryption
    /// @dev Step 2 is off-chain: use relayer-sdk to decrypt
    function getWinnerHandle() external view onlyAfterAuction returns (eaddress) {
        return _highestBidder;
    }

    /// @notice Finalize winner reveal with decryption proof
    /// @dev Step 3 of 3-step async public decryption pattern
    /// @param winnerAddress The decrypted winner address
    /// @param decryptionProof The proof from Zama KMS
    function finalizeWinnerReveal(
        address winnerAddress,
        bytes calldata decryptionProof
    ) external onlyAfterAuction {
        if (!_revealRequested) revert RevealNotRequested();
        if (_revealed) revert AlreadyRevealed();

        // Verify the decryption proof
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = eaddress.unwrap(_highestBidder);

        bytes memory cleartexts = abi.encode(winnerAddress);

        // This reverts if proof is invalid
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Store the revealed winner
        _winner = winnerAddress;
        _revealed = true;

        emit WinnerRevealed(winnerAddress);
    }

    /// @notice Finalize the auction after winner is revealed
    function finalizeAuction() external {
        if (!_revealed) revert RevealNotRequested();
        if (_finalized) revert AuctionAlreadyFinalized();

        _finalized = true;

        emit AuctionFinalized(_winner);
    }



    // ============ View Functions ============

    /// @notice Get auction item description
    /// @return The item description
    function itemDescription() external view returns (string memory) {
        return _itemDescription;
    }

    /// @notice Get auction end time
    /// @return The end timestamp
    function auctionEndTime() external view returns (uint256) {
        return _auctionEndTime;
    }

    /// @notice Check if an address has placed a bid
    /// @param bidder The address to check
    /// @return Whether the address has bid
    function hasBid(address bidder) external view returns (bool) {
        return _hasBid[bidder];
    }

    /// @notice Get number of bidders
    /// @return The bidder count
    function bidderCount() external view returns (uint256) {
        return _bidderCount;
    }

    /// @notice Check if auction is finalized
    /// @return Whether the auction is finalized
    function isFinalized() external view returns (bool) {
        return _finalized;
    }

    /// @notice Check if reveal has been requested
    /// @return Whether reveal is requested
    function isRevealRequested() external view returns (bool) {
        return _revealRequested;
    }

    /// @notice Check if winner has been revealed
    /// @return Whether winner is revealed
    function isRevealed() external view returns (bool) {
        return _revealed;
    }

    /// @notice Get the revealed winner address
    /// @return The winner address (only valid after reveal)
    function getWinner() external view returns (address) {
        if (!_revealed) revert RevealNotRequested();
        return _winner;
    }

    /// @notice Get encrypted bid for an address (requires ACL permission)
    /// @param bidder The bidder address
    /// @return The encrypted bid amount
    function getBid(address bidder) external view returns (euint64) {
        return _bids[bidder];
    }

    /// @notice Get encrypted highest bid (requires ACL permission)
    /// @return The encrypted highest bid
    function getHighestBid() external view returns (euint64) {
        return _highestBid;
    }



    // ============ Internal Functions ============


}

```

## FHE Operations Used

- `FHE.gt()`
- `FHE.max()`
- `FHE.select()`
- `FHE.allowThis()`
- `FHE.allow()`
- `FHE.fromExternal()`
- `FHE.makePubliclyDecryptable()`

## FHE Types Used

- `euint64`
- `externalEuint64`
- `ebool`

## Tags

`auction` `bidding` `nft` `privacy`

## Related Examples

- [sealed-tender](./sealed-tender.md)
- [prediction-market](./prediction-market.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [sealed-tender](./sealed-tender.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
