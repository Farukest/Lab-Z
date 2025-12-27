    /// @notice Grant temporary access to the encrypted counter value
    /// @param recipient Address to grant transient access to
    /// @dev Transient access is only valid for the current transaction
    function grantTransientAccess(address recipient) external {
        FHE.allowTransient(_count, recipient);
        emit TransientAccessGranted(recipient);
    }
