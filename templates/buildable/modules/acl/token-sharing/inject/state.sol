    /// @dev Mapping of addresses that have been granted access to each user's balance
    mapping(address => mapping(address => bool)) private _balanceAccessList;
