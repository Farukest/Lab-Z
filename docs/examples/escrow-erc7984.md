# Escrow with ERC7984

🔴 **Advanced** | 🏗️ OpenZeppelin Contracts

A confidential escrow service for ERC7984 tokens with encrypted amounts

## Overview

This advanced example implements a secure escrow system for ERC7984 tokens. Buyers can deposit encrypted amounts, sellers can refund, and disputes can be resolved by arbiters. All payment amounts remain private throughout the escrow lifecycle.

## Quick Start

```bash
# Create new project from this template
npx labz create escrow-erc7984 my-project

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
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EscrowERC7984 - Confidential Token Escrow
/// @notice An escrow service for ERC7984 tokens with encrypted amounts
/// @dev Supports deposits, releases, refunds, and disputes - all with encrypted amounts
contract EscrowERC7984 is ZamaEthereumConfig, ReentrancyGuard {

    // ============ Errors ============

    error EscrowNotFound();
    error NotAuthorized();
    error EscrowAlreadyReleased();
    error EscrowAlreadyRefunded();
    error EscrowNotInDispute();
    error EscrowInDispute();
    error NotOperator();

    // ============ Events ============

    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller);
    event EscrowDeposited(uint256 indexed escrowId);
    event EscrowReleased(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId);
    event EscrowDisputed(uint256 indexed escrowId);
    event DisputeResolved(uint256 indexed escrowId, bool releasedToSeller);

    // ============ Types ============

    enum EscrowState {
        Created,
        Funded,
        Released,
        Refunded,
        Disputed
    }

    struct Escrow {
        address buyer;
        address seller;
        address arbiter;
        IERC7984 token;
        euint64 amount;
        EscrowState state;
        uint256 deadline;
    }

    // ============ State ============

    /// @dev Escrow ID counter
    uint256 private _escrowIdCounter;

    /// @dev Mapping of escrow ID to escrow data
    mapping(uint256 => Escrow) private _escrows;

    // ============ Constructor ============

    constructor() {}

    // ============ Escrow Creation ============

    /// @notice Create a new escrow
    /// @param seller The seller address
    /// @param arbiter The dispute resolver address
    /// @param token The ERC7984 token for payment
    /// @param deadlineSeconds Time limit for the escrow
    /// @return escrowId The new escrow ID
    function createEscrow(
        address seller,
        address arbiter,
        IERC7984 token,
        uint256 deadlineSeconds
    ) external returns (uint256 escrowId) {
        escrowId = _escrowIdCounter++;

        _escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            arbiter: arbiter,
            token: token,
            amount: euint64.wrap(0),
            state: EscrowState.Created,
            deadline: block.timestamp + deadlineSeconds
        });

        emit EscrowCreated(escrowId, msg.sender, seller);
    }

    // ============ Deposit Functions ============

    /// @notice Deposit funds into an escrow
    /// @param escrowId The escrow ID
    /// @param encryptedAmount Encrypted deposit amount
    /// @param inputProof Proof for the encrypted input
    function deposit(
        uint256 escrowId,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.buyer == address(0)) revert EscrowNotFound();
        if (escrow.buyer != msg.sender) revert NotAuthorized();
        if (escrow.state != EscrowState.Created) revert EscrowAlreadyReleased();

        // Verify operator status
        if (!escrow.token.isOperator(msg.sender, address(this))) {
            revert NotOperator();
        }

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer tokens to escrow
        FHE.allowTransient(amount, address(escrow.token));
        euint64 transferred = escrow.token.confidentialTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // Store escrowed amount
        escrow.amount = FHE.add(escrow.amount, transferred);
        FHE.allowThis(escrow.amount);
        escrow.state = EscrowState.Funded;

        emit EscrowDeposited(escrowId);
    }

    // ============ Release Functions ============

    /// @notice Release escrowed funds to the seller
    /// @param escrowId The escrow ID
    function release(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.buyer == address(0)) revert EscrowNotFound();
        if (escrow.buyer != msg.sender) revert NotAuthorized();
        if (escrow.state != EscrowState.Funded) revert EscrowAlreadyReleased();

        escrow.state = EscrowState.Released;

        // Transfer to seller
        FHE.allowTransient(escrow.amount, address(escrow.token));
        escrow.token.confidentialTransfer(escrow.seller, escrow.amount);

        emit EscrowReleased(escrowId);
    }

    /// @notice Refund escrowed funds to the buyer (seller initiated)
    /// @param escrowId The escrow ID
    function refund(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.buyer == address(0)) revert EscrowNotFound();
        if (escrow.seller != msg.sender) revert NotAuthorized();
        if (escrow.state != EscrowState.Funded) revert EscrowAlreadyReleased();

        escrow.state = EscrowState.Refunded;

        // Transfer back to buyer
        FHE.allowTransient(escrow.amount, address(escrow.token));
        escrow.token.confidentialTransfer(escrow.buyer, escrow.amount);

        emit EscrowRefunded(escrowId);
    }

    // ============ Dispute Functions ============

    /// @notice Raise a dispute (buyer or seller)
    /// @param escrowId The escrow ID
    function dispute(uint256 escrowId) external {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.buyer == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.buyer && msg.sender != escrow.seller) {
            revert NotAuthorized();
        }
        if (escrow.state != EscrowState.Funded) revert EscrowAlreadyReleased();

        escrow.state = EscrowState.Disputed;
        emit EscrowDisputed(escrowId);
    }

    /// @notice Resolve a dispute (arbiter only)
    /// @param escrowId The escrow ID
    /// @param releaseToSeller True to release to seller, false to refund buyer
    function resolveDispute(
        uint256 escrowId,
        bool releaseToSeller
    ) external nonReentrant {
        Escrow storage escrow = _escrows[escrowId];
        if (escrow.buyer == address(0)) revert EscrowNotFound();
        if (escrow.arbiter != msg.sender) revert NotAuthorized();
        if (escrow.state != EscrowState.Disputed) revert EscrowNotInDispute();

        escrow.state = releaseToSeller ? EscrowState.Released : EscrowState.Refunded;

        address recipient = releaseToSeller ? escrow.seller : escrow.buyer;
        FHE.allowTransient(escrow.amount, address(escrow.token));
        escrow.token.confidentialTransfer(recipient, escrow.amount);

        emit DisputeResolved(escrowId, releaseToSeller);
    }

    // ============ View Functions ============

    function getEscrow(uint256 escrowId) external view returns (
        address buyer,
        address seller,
        address arbiter,
        address token,
        EscrowState state,
        uint256 deadline
    ) {
        Escrow storage escrow = _escrows[escrowId];
        return (
            escrow.buyer,
            escrow.seller,
            escrow.arbiter,
            address(escrow.token),
            escrow.state,
            escrow.deadline
        );
    }

    function getEscrowCount() external view returns (uint256) {
        return _escrowIdCounter;
    }

    function getEscrowState(uint256 escrowId) external view returns (EscrowState) {
        return _escrows[escrowId].state;
    }
}

```

## Code Explanation

### Create Escrow

Create a new escrow with buyer, seller, arbiter, and deadline. The escrow starts in Created state.

*Lines 73-92*

### Deposit

Buyer deposits encrypted tokens into the escrow using confidentialTransferFrom.

*Lines 100-131*

### Release

Buyer releases escrowed funds to the seller, completing the transaction.

*Lines 137-150*

### Refund

Seller initiates a refund back to the buyer.

*Lines 154-167*

### Dispute

Either party can raise a dispute to involve the arbiter.

*Lines 173-183*

### Resolve Dispute

Arbiter resolves the dispute by deciding whether to release to seller or refund buyer.

*Lines 188-204*

## FHE Operations Used

- `FHE.confidentialTransferFrom()`
- `FHE.confidentialTransfer()`
- `FHE.FHE.add()`
- `FHE.FHE.allowTransient()`
- `FHE.FHE.allowThis()`
- `FHE.fromExternal()`

## FHE Types Used

- `euint64`
- `ebool`

## Tags

`escrow` `ERC7984` `payment` `dispute` `arbiter` `OpenZeppelin`

## Related Examples

- [erc7984-token](./erc7984-token.md)
- [swap-erc7984-to-erc7984](./swap-erc7984-to-erc7984.md)

## Prerequisites

Before this example, you should understand:
- [erc7984-token](./erc7984-token.md)

## Next Steps

After this example, check out:
- [prediction-market-erc7984](./prediction-market-erc7984.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
