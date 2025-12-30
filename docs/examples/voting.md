# Private Voting

🟡 **Intermediate** | 🚀 Advanced

Encrypted voting system with private ballots and verifiable tallying

## Overview

A private voting system where each vote is encrypted and no one can see individual votes. Vote counts are tallied homomorphically - addition happens on encrypted values. Demonstrates FHE.add for accumulating encrypted votes and proper ACL for vote privacy. Essential pattern for DAOs and governance systems.

## Quick Start

```bash
# Create new project from this template
npx labz create voting my-project

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

/// @title Voting - Encrypted Voting
/// @notice Private voting system using FHE - votes are encrypted and tallied homomorphically
/// @dev Generated with Lab-Z Composable Templates
contract Voting is ZamaEthereumConfig {

    // ============ Errors ============

    /// @dev Proposal does not exist
    error ProposalNotFound(uint256 proposalId);
    /// @dev Voting period has ended
    error VotingEnded(uint256 proposalId);
    /// @dev Voting period has not ended yet
    error VotingNotEnded(uint256 proposalId);
    /// @dev User has already voted
    error AlreadyVoted(address voter, uint256 proposalId);
    /// @dev Invalid vote value
    error InvalidVote();


    // ============ Events ============

    /// @notice Emitted when a new proposal is created
    event ProposalCreated(uint256 indexed proposalId, string description, uint256 endTime);
    /// @notice Emitted when a vote is cast
    event VoteCast(address indexed voter, uint256 indexed proposalId);


    // ============ Structs ============

    struct Proposal {
        string description;
        uint256 endTime;
        euint64 yesVotes;
        euint64 noVotes;
        bool exists;
        bool finalized;
    }

    // ============ State Variables ============

    /// @dev Proposal storage
    mapping(uint256 => Proposal) private _proposals;

    /// @dev Track if user has voted on a proposal
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    /// @dev Next proposal ID
    uint256 private _nextProposalId;



    // ============ Modifiers ============



    // ============ Constructor ============

    constructor() {
        _nextProposalId = 1;

    }

    // ============ External Functions ============

    /// @notice Create a new proposal
    /// @param description The proposal description
    /// @param durationSeconds How long the voting period lasts
    /// @return proposalId The ID of the created proposal
    function createProposal(
        string calldata description,
        uint256 durationSeconds
    ) external  returns (uint256 proposalId) {
        proposalId = _nextProposalId++;

        Proposal storage proposal = _proposals[proposalId];
        proposal.description = description;
        proposal.endTime = block.timestamp + durationSeconds;
        proposal.yesVotes = FHE.asEuint64(0);
        proposal.noVotes = FHE.asEuint64(0);
        proposal.exists = true;

        // Set ACL for vote counts
        FHE.allowThis(proposal.yesVotes);
        FHE.allowThis(proposal.noVotes);

        emit ProposalCreated(proposalId, description, proposal.endTime);
    }

    /// @notice Cast an encrypted vote
    /// @param proposalId The proposal to vote on
    /// @param encryptedVote Encrypted vote (1 = yes, 0 = no)
    /// @param inputProof Zero-knowledge proof for the input
    function vote(
        uint256 proposalId,
        externalEuint64 encryptedVote,
        bytes calldata inputProof
    ) external  {


        Proposal storage proposal = _proposals[proposalId];

        if (!proposal.exists) {
            revert ProposalNotFound(proposalId);
        }
        if (block.timestamp > proposal.endTime) {
            revert VotingEnded(proposalId);
        }
        if (_hasVoted[proposalId][msg.sender]) {
            revert AlreadyVoted(msg.sender, proposalId);
        }

        // Convert external input to internal encrypted value
        euint64 eVote = FHE.fromExternal(encryptedVote, inputProof);

        // Encrypted vote: if vote > 0, it's a yes vote
        ebool isYes = FHE.gt(eVote, FHE.asEuint64(0));

        // Homomorphic conditional addition
        // yesVotes += isYes ? 1 : 0
        // noVotes += isYes ? 0 : 1
        euint64 one = FHE.asEuint64(1);
        euint64 zero = FHE.asEuint64(0);

        proposal.yesVotes = FHE.add(proposal.yesVotes, FHE.select(isYes, one, zero));
        proposal.noVotes = FHE.add(proposal.noVotes, FHE.select(isYes, zero, one));

        // Mark as voted
        _hasVoted[proposalId][msg.sender] = true;



        // Set ACL permissions
        FHE.allowThis(proposal.yesVotes);
        FHE.allowThis(proposal.noVotes);


        emit VoteCast(msg.sender, proposalId);
    }



    // ============ View Functions ============

    /// @notice Get proposal details (without encrypted vote counts)
    /// @param proposalId The proposal ID
    /// @return description The proposal description
    /// @return endTime When voting ends
    /// @return exists Whether the proposal exists
    /// @return finalized Whether the proposal has been finalized
    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 endTime,
        bool exists,
        bool finalized
    ) {
        Proposal storage proposal = _proposals[proposalId];
        return (proposal.description, proposal.endTime, proposal.exists, proposal.finalized);
    }

    /// @notice Check if an address has voted on a proposal
    /// @param proposalId The proposal ID
    /// @param voter The voter address
    /// @return Whether the voter has voted
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }

    /// @notice Get the encrypted vote counts (requires ACL permission)
    /// @param proposalId The proposal ID
    /// @return yesVotes Encrypted yes vote count
    /// @return noVotes Encrypted no vote count
    function getVoteCounts(uint256 proposalId) external view returns (
        euint64 yesVotes,
        euint64 noVotes
    ) {
        Proposal storage proposal = _proposals[proposalId];
        if (!proposal.exists) {
            revert ProposalNotFound(proposalId);
        }
        return (proposal.yesVotes, proposal.noVotes);
    }

    /// @notice Get the next proposal ID
    /// @return The next proposal ID that will be assigned
    function nextProposalId() external view returns (uint256) {
        return _nextProposalId;
    }



    // ============ Internal Functions ============


}

```

## FHE Operations Used

- `FHE.add()`
- `FHE.allowThis()`
- `FHE.allow()`
- `FHE.fromExternal()`
- `FHE.asEuint32()`

## FHE Types Used

- `euint32`
- `externalEuint32`
- `ebool`

## Tags

`voting` `governance` `dao` `privacy` `elections`

## Related Examples

- [quadratic-vote](./quadratic-vote.md)
- [prediction-market](./prediction-market.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)
- [acl-allow](./acl-allow.md)

## Next Steps

After this example, check out:
- [quadratic-vote](./quadratic-vote.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
