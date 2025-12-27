    /// @notice Share a proposal's encrypted vote counts with an address permanently
    /// @param proposalId The proposal whose vote counts to share
    /// @param grantee Address to grant access to the vote counts
    /// @dev This calls FHE.allow() to grant real ACL permission for both yes and no votes
    function shareVoteCounts(uint256 proposalId, address grantee) external {
        require(grantee != address(0), "Invalid address");
        Proposal storage proposal = _proposals[proposalId];
        require(proposal.exists, "Proposal not found");

        // Grant real FHE ACL permission to both vote counts
        FHE.allow(proposal.yesVotes, grantee);
        FHE.allow(proposal.noVotes, grantee);

        _voteCountAccessList[proposalId][grantee] = true;
        emit VoteCountAccessGranted(proposalId, grantee);
    }

    /// @notice Check if an address has been granted access to vote counts via this contract
    /// @param proposalId The proposal ID
    /// @param account Address to check
    /// @return Whether the address was granted access through shareVoteCounts()
    function hasVoteCountAccess(uint256 proposalId, address account) external view returns (bool) {
        return _voteCountAccessList[proposalId][account];
    }

    /// @notice Check if an address has real FHE ACL permission to proposal vote counts
    /// @param proposalId The proposal ID
    /// @param account Address to check
    /// @return hasYesAccess Whether the address has FHE access to yes votes
    /// @return hasNoAccess Whether the address has FHE access to no votes
    /// @dev This queries the FHE ACL system directly
    function checkVoteCountFHEAccess(uint256 proposalId, address account) external view returns (bool hasYesAccess, bool hasNoAccess) {
        Proposal storage proposal = _proposals[proposalId];
        if (!proposal.exists) {
            return (false, false);
        }
        hasYesAccess = FHE.isAllowed(proposal.yesVotes, account);
        hasNoAccess = FHE.isAllowed(proposal.noVotes, account);
    }
