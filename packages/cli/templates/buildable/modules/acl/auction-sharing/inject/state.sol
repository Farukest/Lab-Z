    /// @dev Mapping of addresses that have been granted access to each bidder's bid
    mapping(address => mapping(address => bool)) private _bidAccessList;
