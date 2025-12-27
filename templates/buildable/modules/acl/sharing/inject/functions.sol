    /// @notice Grant permanent access to encrypted counter value
    /// @param grantee Address to grant access to
    /// @dev This actually calls FHE.allow() to grant real ACL permission
    function grantAccess(address grantee) external {
        require(grantee != address(0), "Invalid address");
        // Grant real FHE ACL permission to the encrypted value
        FHE.allow(_count, grantee);
        _accessList[grantee] = true;
        emit AccessGranted(grantee);
    }

    /// @notice Check if an address has been granted access via this contract
    /// @param account Address to check
    /// @return Whether the address was granted access through grantAccess()
    function hasAccess(address account) external view returns (bool) {
        return _accessList[account];
    }

    /// @notice Check if an address has real FHE ACL permission
    /// @param account Address to check
    /// @return Whether the address has actual FHE access to the encrypted value
    /// @dev This queries the FHE ACL system directly
    function checkFHEAccess(address account) external view returns (bool) {
        return FHE.isAllowed(_count, account);
    }
