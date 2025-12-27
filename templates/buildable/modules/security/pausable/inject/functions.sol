
    /// @notice Returns true if the contract is paused
    /// @return True if paused, false otherwise
    function paused() public view returns (bool) {
        return _paused;
    }

    /// @notice Pauses the contract
    /// @dev Can be called by anyone (consider adding onlyOwner with admin/ownable module)
    function pause() external whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpauses the contract
    /// @dev Can be called by anyone (consider adding onlyOwner with admin/ownable module)
    function unpause() external whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }