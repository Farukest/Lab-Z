    /// @notice Share your encrypted balance with another address permanently
    /// @param grantee Address to grant access to your balance
    /// @dev This calls FHE.allow() to grant real ACL permission
    function shareBalance(address grantee) external {
        require(grantee != address(0), "Invalid address");
        // Grant real FHE ACL permission to the caller's encrypted balance
        FHE.allow(_balances[msg.sender], grantee);
        _balanceAccessList[msg.sender][grantee] = true;
        emit BalanceAccessGranted(msg.sender, grantee);
    }

    /// @notice Check if an address has been granted access to a balance via this contract
    /// @param owner The balance owner
    /// @param account Address to check
    /// @return Whether the address was granted access through shareBalance()
    function hasBalanceAccess(address owner, address account) external view returns (bool) {
        return _balanceAccessList[owner][account];
    }

    /// @notice Check if an address has real FHE ACL permission to a balance
    /// @param owner The balance owner
    /// @param account Address to check
    /// @return Whether the address has actual FHE access to the encrypted balance
    /// @dev This queries the FHE ACL system directly
    function checkBalanceFHEAccess(address owner, address account) external view returns (bool) {
        return FHE.isAllowed(_balances[owner], account);
    }
