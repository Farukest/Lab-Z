    /// @dev Default admin role - can grant/revoke all roles
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    /// @dev Operator role - can perform privileged operations
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @dev Role membership mapping
    mapping(bytes32 => mapping(address => bool)) private _roles;
