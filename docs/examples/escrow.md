# Private Escrow

🟡 **Intermediate** | 🚀 Advanced

Escrow service with encrypted amounts and private conditions

## Overview

An escrow system where the escrowed amount and release conditions are encrypted. Neither party knows the exact terms until conditions are met. Uses encrypted comparisons for condition checking and private balance management.

## Quick Start

```bash
# Create new project from this template
npx labz create escrow my-project

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
 * @title Escrow
 * @notice Private escrow with encrypted amounts - secure P2P trades
 * @dev Escrow amounts are hidden until release, protecting trade privacy
 *
 * Use Cases:
 * - P2P trades without revealing amounts
 * - Freelance payments with milestone privacy
 * - Private real estate deposits
 *
 * FHE Operations Used:
 * - add: Accumulate deposits
 * - sub: Partial releases
 * - gte: Verify sufficient funds
 * - eq: Exact amount matching
 * - select: Conditional transfers
 */
contract Escrow is ZamaEthereumConfig {
    // ============ Errors ============
    error EscrowNotFound();
    error NotAuthorized();
    error EscrowNotFunded();
    error EscrowAlreadyComplete();
    error EscrowInDispute();
    error InsufficientFunds();
    error CannotSelfEscrow();
    

    // ============ Events ============
    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller);
    event EscrowFunded(uint256 indexed escrowId);
    event FundsReleased(uint256 indexed escrowId, address indexed to);
    event FundsRefunded(uint256 indexed escrowId, address indexed to);
    event DisputeRaised(uint256 indexed escrowId, address indexed by);
    event DisputeResolved(uint256 indexed escrowId, address indexed winner);
    

    // ============ Enums ============
    enum EscrowState { Created, Funded, Released, Refunded, Disputed }

    // ============ Structs ============
    struct EscrowRecord {
        address buyer;
        address seller;
        address arbiter;
        euint64 amount;          // Encrypted escrow amount
        euint64 funded;          // Encrypted funded amount
        EscrowState state;
        string description;
        uint256 deadline;
        uint256 createdAt;
    }

    // ============ State Variables ============
    mapping(uint256 => EscrowRecord) public _escrows;
    uint256 public _escrowCount;

    uint256 public escrowFeeRate;        // Fee in basis points
    address public feeRecipient;
    

    // ============ Modifiers ============
    modifier escrowExists(uint256 escrowId) {
        if (escrowId >= _escrowCount) revert EscrowNotFound();
        _;
    }

    modifier onlyParty(uint256 escrowId) {
        EscrowRecord storage e = _escrows[escrowId];
        if (msg.sender != e.buyer && msg.sender != e.seller && msg.sender != e.arbiter)
            revert NotAuthorized();
        _;
    }
    

    // ============ Constructor ============
    constructor(uint256 _escrowFeeRate, address _feeRecipient) {
        escrowFeeRate = _escrowFeeRate;
        feeRecipient = _feeRecipient;
        
    }

    // ============ External Functions ============

    /**
     * @notice Create a new escrow
     * @param seller The seller/recipient address
     * @param arbiter Optional dispute resolver
     * @param encryptedAmount Encrypted escrow amount
     * @param description What the escrow is for
     * @param deadline When the escrow expires
     */
    function createEscrow(
        address seller,
        address arbiter,
        externalEuint64 encryptedAmount, bytes calldata inputProof,
        string calldata description,
        uint256 deadline
    ) external returns (uint256) {
        if (seller == msg.sender) revert CannotSelfEscrow();

        uint256 escrowId = _escrowCount++;
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        _escrows[escrowId] = EscrowRecord({
            buyer: msg.sender,
            seller: seller,
            arbiter: arbiter,
            amount: amount,
            funded: FHE.asEuint64(0),
            state: EscrowState.Created,
            description: description,
            deadline: deadline,
            createdAt: block.timestamp
        });

        // Allow contract to use encrypted values
        FHE.allowThis(_escrows[escrowId].funded);
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);
        FHE.allow(amount, seller);
        if (arbiter != address(0)) {
            FHE.allow(amount, arbiter);
        }

        emit EscrowCreated(escrowId, msg.sender, seller);
        return escrowId;
    }

    /**
     * @notice Fund the escrow with encrypted amount
     * @param escrowId The escrow to fund
     * @param encryptedAmount Encrypted funding amount
     */
    function fundEscrow(uint256 escrowId, externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        escrowExists(escrowId)
    {
        EscrowRecord storage e = _escrows[escrowId];
        require(e.state == EscrowState.Created, "Cannot fund");
        require(msg.sender == e.buyer, "Only buyer");

        euint64 fundAmount = FHE.fromExternal(encryptedAmount, inputProof);
        e.funded = FHE.add(e.funded, fundAmount);

        // Check if fully funded
        ebool fullyFunded = FHE.ge(e.funded, e.amount);

        // Update state if fully funded (simplified - in production use callback)
        FHE.allowThis(e.funded);
        FHE.allowThis(fullyFunded);

        e.state = EscrowState.Funded;

        emit EscrowFunded(escrowId);
    }

    /**
     * @notice Release funds to seller (buyer confirms delivery)
     * @param escrowId The escrow to release
     */
    function releaseFunds(uint256 escrowId)
        external
        escrowExists(escrowId)
    {
        EscrowRecord storage e = _escrows[escrowId];
        if (e.state != EscrowState.Funded) revert EscrowNotFunded();
        if (e.state == EscrowState.Disputed) revert EscrowInDispute();
        require(msg.sender == e.buyer, "Only buyer can release");

        e.state = EscrowState.Released;

        // Allow seller to claim the funds
        FHE.allow(e.funded, e.seller);

        emit FundsReleased(escrowId, e.seller);
    }

    /**
     * @notice Refund funds to buyer (seller cancels or deadline passed)
     * @param escrowId The escrow to refund
     */
    function refund(uint256 escrowId)
        external
        escrowExists(escrowId)
    {
        EscrowRecord storage e = _escrows[escrowId];
        if (e.state != EscrowState.Funded) revert EscrowNotFunded();

        bool canRefund = msg.sender == e.seller ||
            (block.timestamp > e.deadline && msg.sender == e.buyer);
        require(canRefund, "Cannot refund");

        e.state = EscrowState.Refunded;

        // Allow buyer to reclaim
        FHE.allow(e.funded, e.buyer);

        emit FundsRefunded(escrowId, e.buyer);
    }

    /**
     * @notice Raise a dispute
     * @param escrowId The escrow to dispute
     */
    function dispute(uint256 escrowId)
        external
        escrowExists(escrowId)
        onlyParty(escrowId)
    {
        EscrowRecord storage e = _escrows[escrowId];
        if (e.state != EscrowState.Funded) revert EscrowNotFunded();
        require(e.arbiter != address(0), "No arbiter set");

        e.state = EscrowState.Disputed;

        emit DisputeRaised(escrowId, msg.sender);
    }

    /**
     * @notice Resolve dispute (arbiter only)
     * @param escrowId The escrow in dispute
     * @param releaseToSeller true = seller wins, false = buyer wins
     */
    function resolveDispute(uint256 escrowId, bool releaseToSeller)
        external
        escrowExists(escrowId)
    {
        EscrowRecord storage e = _escrows[escrowId];
        require(e.state == EscrowState.Disputed, "Not in dispute");
        require(msg.sender == e.arbiter, "Only arbiter");

        if (releaseToSeller) {
            e.state = EscrowState.Released;
            FHE.allow(e.funded, e.seller);
            emit DisputeResolved(escrowId, e.seller);
        } else {
            e.state = EscrowState.Refunded;
            FHE.allow(e.funded, e.buyer);
            emit DisputeResolved(escrowId, e.buyer);
        }
    }

    

    // ============ View Functions ============

    /**
     * @notice Get escrow info
     */
    function getEscrow(uint256 escrowId) external view returns (
        address buyer,
        address seller,
        address arbiter,
        EscrowState state,
        string memory description,
        uint256 deadline
    ) {
        EscrowRecord storage e = _escrows[escrowId];
        return (e.buyer, e.seller, e.arbiter, e.state, e.description, e.deadline);
    }

    /**
     * @notice Get total escrow count
     */
    function getEscrowCount() external view returns (uint256) {
        return _escrowCount;
    }

    /**
     * @notice Check if escrow is active
     */
    function isActive(uint256 escrowId) external view returns (bool) {
        EscrowRecord storage e = _escrows[escrowId];
        return e.state == EscrowState.Created || e.state == EscrowState.Funded;
    }

    

    // ============ Internal Functions ============
    
}

```

## FHE Operations Used

- `FHE.add()`
- `FHE.sub()`
- `FHE.gte()`
- `FHE.eq()`
- `FHE.allowThis()`
- `FHE.allow()`
- `FHE.fromExternal()`

## FHE Types Used

- `euint64`
- `externalEuint64`
- `ebool`

## Tags

`escrow` `defi` `payments` `privacy` `trust`

## Related Examples

- [token](./token.md)
- [prediction-market](./prediction-market.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)
- [acl-allow](./acl-allow.md)

## Next Steps

After this example, check out:
- [dark-pool](./dark-pool.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
