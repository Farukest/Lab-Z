    /// @notice Share your encrypted bid with another address permanently
    /// @param grantee Address to grant access to your bid
    /// @dev This calls FHE.allow() to grant real ACL permission
    function shareBid(address grantee) external {
        require(grantee != address(0), "Invalid address");
        require(_hasBid[msg.sender], "No bid placed");
        // Grant real FHE ACL permission to the caller's encrypted bid
        FHE.allow(_bids[msg.sender], grantee);
        _bidAccessList[msg.sender][grantee] = true;
        emit BidAccessGranted(msg.sender, grantee);
    }

    /// @notice Check if an address has been granted access to a bid via this contract
    /// @param bidder The bid owner
    /// @param account Address to check
    /// @return Whether the address was granted access through shareBid()
    function hasBidAccess(address bidder, address account) external view returns (bool) {
        return _bidAccessList[bidder][account];
    }

    /// @notice Check if an address has real FHE ACL permission to a bid
    /// @param bidder The bid owner
    /// @param account Address to check
    /// @return Whether the address has actual FHE access to the encrypted bid
    /// @dev This queries the FHE ACL system directly
    function checkBidFHEAccess(address bidder, address account) external view returns (bool) {
        return FHE.isAllowed(_bids[bidder], account);
    }
