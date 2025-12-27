    /// @dev Mapping of addresses that have been granted access to each proposal's vote counts
    mapping(uint256 => mapping(address => bool)) private _voteCountAccessList;
