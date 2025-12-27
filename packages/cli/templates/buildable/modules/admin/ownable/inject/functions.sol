    /// @notice Returns the current owner
    /// @return The owner address
    function owner() public view returns (address) {
        return _owner;
    }

    /// @notice Transfers ownership to a new account
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /// @notice Renounces ownership, leaving the contract without an owner
    /// @dev Can only be called by the current owner
    function renounceOwnership() external onlyOwner {
        address oldOwner = _owner;
        _owner = address(0);
        emit OwnershipTransferred(oldOwner, address(0));
    }
