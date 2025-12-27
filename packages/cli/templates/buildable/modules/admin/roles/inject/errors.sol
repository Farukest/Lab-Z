    /// @dev Account is missing a required role
    error AccessControlUnauthorizedAccount(address account, bytes32 role);
    /// @dev Cannot revoke role from self
    error AccessControlCannotRevokeSelf();
