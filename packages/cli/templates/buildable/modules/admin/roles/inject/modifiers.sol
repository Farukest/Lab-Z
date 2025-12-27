    /// @dev Throws if called by account without the specified role
    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) {
            revert AccessControlUnauthorizedAccount(msg.sender, role);
        }
        _;
    }
