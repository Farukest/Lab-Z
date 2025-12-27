    /// @notice Grant a role to an account
    /// @param role The role to grant
    /// @param account The account to grant the role to
    function grantRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    /// @notice Revoke a role from an account
    /// @param role The role to revoke
    /// @param account The account to revoke the role from
    function revokeRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (role == DEFAULT_ADMIN_ROLE && account == msg.sender) {
            revert AccessControlCannotRevokeSelf();
        }
        if (_roles[role][account]) {
            _roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    /// @notice Check if an account has a role
    /// @param role The role to check
    /// @param account The account to check
    /// @return Whether the account has the role
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }
