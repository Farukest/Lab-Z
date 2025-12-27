// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HandleObservatory
 * @author FHEVM Tutorial
 * @notice Advanced handle tracking and registry system for debugging and auditing
 *
 * ============================================================================
 *                         HANDLE OBSERVATORY
 * ============================================================================
 *
 * This contract provides a comprehensive system for tracking FHE handles:
 *
 *   1. REGISTRY - Every handle is registered with metadata
 *   2. GENEALOGY - Track parent-child relationships between handles
 *   3. PERMISSIONS - Audit trail of all permission grants
 *   4. LIFECYCLE - Monitor handle states (active, decrypted, etc.)
 *
 * ============================================================================
 *                            USE CASES
 * ============================================================================
 *
 *   - DEBUGGING: Trace which operation created which handle
 *   - AUDITING: See who has permission on which handles
 *   - OPTIMIZATION: Identify duplicate handle creation
 *   - COMPLIANCE: Full audit trail of encrypted data lifecycle
 *
 * ============================================================================
 *                        HANDLE METADATA
 * ============================================================================
 *
 *   struct HandleInfo {
 *       uint256 rawHandle;      // The 256-bit handle value
 *       string name;            // Human-readable identifier
 *       HandleOrigin origin;    // How it was created
 *       uint256 parentHandle;   // Parent (if from operation)
 *       uint256 createdAt;      // Block timestamp
 *       HandleState state;      // Current state
 *   }
 *
 * ============================================================================
 */
contract HandleObservatory is ZamaEthereumConfig {

    // =========================================================================
    //                              ENUMS
    // =========================================================================

    /// @notice How a handle was created
    enum HandleOrigin {
        PLAINTEXT,      // FHE.asEuint64(value)
        USER_INPUT,     // FHE.fromExternal(input, proof)
        OPERATION,      // FHE.add(), FHE.mul(), etc.
        RANDOM          // FHE.randEuint64()
    }

    /// @notice Current state of a handle
    enum HandleState {
        ACTIVE,         // Handle is live and usable
        DECRYPTING,     // Decryption requested, waiting for callback
        DECRYPTED,      // Value has been revealed
        ARCHIVED        // Marked as no longer needed
    }

    // =========================================================================
    //                              STRUCTS
    // =========================================================================

    /// @notice Complete metadata for a registered handle
    struct HandleInfo {
        uint256 rawHandle;          // The 256-bit handle value
        string name;                // Human-readable identifier
        HandleOrigin origin;        // How it was created
        uint256[] parentHandles;    // Parent handles (for operations)
        string operationType;       // "add", "mul", etc. (if from operation)
        uint256 createdAt;          // Block timestamp
        address creator;            // Who created it
        HandleState state;          // Current lifecycle state
        uint64 decryptedValue;      // Value after decryption (0 if not decrypted)
    }

    /// @notice Permission grant record
    struct PermissionRecord {
        uint256 rawHandle;          // Which handle
        address grantee;            // Who received permission
        string permissionType;      // "allow", "allowTransient", "allowThis"
        uint256 grantedAt;          // When it was granted
        address grantedBy;          // Who granted it
    }

    // =========================================================================
    //                              EVENTS
    // =========================================================================

    /// @notice Emitted when a new handle is registered
    event HandleRegistered(
        uint256 indexed rawHandle,
        string name,
        HandleOrigin origin,
        address indexed creator
    );

    /// @notice Emitted when a child handle is created from parents
    event HandleDerived(
        uint256 indexed childHandle,
        uint256[] parentHandles,
        string operation
    );

    /// @notice Emitted when permission is granted
    event PermissionRecorded(
        uint256 indexed rawHandle,
        address indexed grantee,
        string permissionType
    );

    /// @notice Emitted when handle state changes
    event HandleStateChanged(
        uint256 indexed rawHandle,
        HandleState oldState,
        HandleState newState
    );

    /// @notice Emitted when a handle is decrypted
    event HandleDecrypted(
        uint256 indexed rawHandle,
        uint64 value
    );

    // =========================================================================
    //                              STATE
    // =========================================================================

    /// @notice Counter for registered handles
    uint256 public handleCount;

    /// @notice All registered handles (indexed by rawHandle)
    mapping(uint256 => HandleInfo) public handleRegistry;

    /// @notice Mapping from ID (1-based) to rawHandle
    mapping(uint256 => uint256) public handleById;

    /// @notice All permission records
    PermissionRecord[] public permissionLog;

    /// @notice The actual encrypted values (stored by name for easy access)
    mapping(string => euint64) private _handles;

    // =========================================================================
    //                         HANDLE REGISTRATION
    // =========================================================================

    /**
     * @notice Create and register a handle from plaintext
     * @param value The plaintext value to encrypt
     * @param name Human-readable identifier for this handle
     * @return rawHandle The 256-bit handle value
     */
    function createFromPlaintext(
        uint64 value,
        string calldata name
    ) external returns (uint256 rawHandle) {
        // Create the encrypted handle
        euint64 handle = FHE.asEuint64(value);
        FHE.allowThis(handle);
        FHE.allow(handle, msg.sender);

        rawHandle = uint256(euint64.unwrap(handle));

        // Register it
        _registerHandle(
            rawHandle,
            name,
            HandleOrigin.PLAINTEXT,
            new uint256[](0),
            ""
        );

        // Store for later use
        _handles[name] = handle;

        // Record permission grants
        _recordPermission(rawHandle, address(this), "allowThis");
        _recordPermission(rawHandle, msg.sender, "allow");
    }

    /**
     * @notice Create and register a handle from user input
     * @param encryptedInput The encrypted value from the user
     * @param inputProof Proof of valid encryption
     * @param name Human-readable identifier
     * @return rawHandle The 256-bit handle value
     */
    function createFromUserInput(
        externalEuint64 encryptedInput,
        bytes calldata inputProof,
        string calldata name
    ) external returns (uint256 rawHandle) {
        euint64 handle = FHE.fromExternal(encryptedInput, inputProof);
        FHE.allowThis(handle);
        FHE.allow(handle, msg.sender);

        rawHandle = uint256(euint64.unwrap(handle));

        _registerHandle(
            rawHandle,
            name,
            HandleOrigin.USER_INPUT,
            new uint256[](0),
            ""
        );

        _handles[name] = handle;
        _recordPermission(rawHandle, address(this), "allowThis");
        _recordPermission(rawHandle, msg.sender, "allow");
    }

    /**
     * @notice Create and register a random handle
     * @param name Human-readable identifier
     * @return rawHandle The 256-bit handle value
     */
    function createRandom(string calldata name) external returns (uint256 rawHandle) {
        euint64 handle = FHE.randEuint64();
        FHE.allowThis(handle);
        FHE.allow(handle, msg.sender);

        rawHandle = uint256(euint64.unwrap(handle));

        _registerHandle(
            rawHandle,
            name,
            HandleOrigin.RANDOM,
            new uint256[](0),
            ""
        );

        _handles[name] = handle;
        _recordPermission(rawHandle, address(this), "allowThis");
        _recordPermission(rawHandle, msg.sender, "allow");
    }

    // =========================================================================
    //                         OPERATIONS (WITH TRACKING)
    // =========================================================================

    /**
     * @notice Add two handles and register the result
     * @param nameA Name of first operand
     * @param nameB Name of second operand
     * @param resultName Name for the result
     * @return rawHandle The 256-bit handle of the result
     */
    function operationAdd(
        string calldata nameA,
        string calldata nameB,
        string calldata resultName
    ) external returns (uint256 rawHandle) {
        euint64 handleA = _handles[nameA];
        euint64 handleB = _handles[nameB];

        require(euint64.unwrap(handleA) != bytes32(0), "Handle A not found");
        require(euint64.unwrap(handleB) != bytes32(0), "Handle B not found");

        // Perform operation
        euint64 result = FHE.add(handleA, handleB);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        rawHandle = uint256(euint64.unwrap(result));

        // Record parent-child relationship
        uint256[] memory parents = new uint256[](2);
        parents[0] = uint256(euint64.unwrap(handleA));
        parents[1] = uint256(euint64.unwrap(handleB));

        _registerHandle(
            rawHandle,
            resultName,
            HandleOrigin.OPERATION,
            parents,
            "add"
        );

        emit HandleDerived(rawHandle, parents, "add");

        _handles[resultName] = result;
        _recordPermission(rawHandle, address(this), "allowThis");
        _recordPermission(rawHandle, msg.sender, "allow");
    }

    /**
     * @notice Multiply two handles and register the result
     */
    function operationMul(
        string calldata nameA,
        string calldata nameB,
        string calldata resultName
    ) external returns (uint256 rawHandle) {
        euint64 handleA = _handles[nameA];
        euint64 handleB = _handles[nameB];

        require(euint64.unwrap(handleA) != bytes32(0), "Handle A not found");
        require(euint64.unwrap(handleB) != bytes32(0), "Handle B not found");

        euint64 result = FHE.mul(handleA, handleB);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        rawHandle = uint256(euint64.unwrap(result));

        uint256[] memory parents = new uint256[](2);
        parents[0] = uint256(euint64.unwrap(handleA));
        parents[1] = uint256(euint64.unwrap(handleB));

        _registerHandle(rawHandle, resultName, HandleOrigin.OPERATION, parents, "mul");
        emit HandleDerived(rawHandle, parents, "mul");

        _handles[resultName] = result;
        _recordPermission(rawHandle, address(this), "allowThis");
        _recordPermission(rawHandle, msg.sender, "allow");
    }

    /**
     * @notice Compare two handles (greater than)
     */
    function operationGt(
        string calldata nameA,
        string calldata nameB,
        string calldata resultName
    ) external returns (uint256 rawHandle) {
        euint64 handleA = _handles[nameA];
        euint64 handleB = _handles[nameB];

        ebool result = FHE.gt(handleA, handleB);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        rawHandle = uint256(ebool.unwrap(result));

        uint256[] memory parents = new uint256[](2);
        parents[0] = uint256(euint64.unwrap(handleA));
        parents[1] = uint256(euint64.unwrap(handleB));

        _registerHandle(rawHandle, resultName, HandleOrigin.OPERATION, parents, "gt");
        emit HandleDerived(rawHandle, parents, "gt");

        _recordPermission(rawHandle, address(this), "allowThis");
        _recordPermission(rawHandle, msg.sender, "allow");
    }

    // =========================================================================
    //                         PERMISSION MANAGEMENT
    // =========================================================================

    /**
     * @notice Grant permanent permission and record it
     */
    function grantPermission(string calldata name, address grantee) external {
        euint64 handle = _handles[name];
        require(euint64.unwrap(handle) != bytes32(0), "Handle not found");

        FHE.allow(handle, grantee);
        _recordPermission(uint256(euint64.unwrap(handle)), grantee, "allow");
    }

    /**
     * @notice Grant transient permission and record it
     */
    function grantTransientPermission(string calldata name, address grantee) external {
        euint64 handle = _handles[name];
        require(euint64.unwrap(handle) != bytes32(0), "Handle not found");

        FHE.allowTransient(handle, grantee);
        _recordPermission(uint256(euint64.unwrap(handle)), grantee, "allowTransient");
    }

    // =========================================================================
    //                         DECRYPTION (STATE CHANGE)
    // =========================================================================

    /**
     * @notice Request decryption of a handle (STEP 1 of 3-step pattern)
     * @param name Name of the handle to decrypt
     */
    function requestDecryption(string calldata name) external {
        euint64 handle = _handles[name];
        uint256 rawHandle = uint256(euint64.unwrap(handle));
        require(rawHandle != 0, "Handle not found");

        // Update state to DECRYPTING
        HandleState oldState = handleRegistry[rawHandle].state;
        handleRegistry[rawHandle].state = HandleState.DECRYPTING;
        emit HandleStateChanged(rawHandle, oldState, HandleState.DECRYPTING);

        // STEP 1: Mark for public decryption
        FHE.makePubliclyDecryptable(handle);
    }

    /**
     * @notice Get handle for off-chain decryption (STEP 2 helper)
     */
    function getHandleForDecryption(string calldata name) external view returns (bytes32) {
        return euint64.unwrap(_handles[name]);
    }

    /**
     * @notice Finalize decryption with proof (STEP 3)
     */
    function finalizeDecryption(
        string calldata name,
        uint64 clearValue,
        bytes calldata decryptionProof
    ) external {
        euint64 handle = _handles[name];
        uint256 rawHandle = uint256(euint64.unwrap(handle));
        require(rawHandle != 0, "Handle not found");

        // Build ciphertext array for verification
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(handle);

        // Build cleartext bytes for verification
        bytes memory cleartexts = abi.encode(clearValue);

        // Verify the decryption proof
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Update state to DECRYPTED
        HandleState oldState = handleRegistry[rawHandle].state;
        handleRegistry[rawHandle].state = HandleState.DECRYPTED;
        handleRegistry[rawHandle].decryptedValue = clearValue;

        emit HandleStateChanged(rawHandle, oldState, HandleState.DECRYPTED);
        emit HandleDecrypted(rawHandle, clearValue);
    }

    // =========================================================================
    //                         QUERY FUNCTIONS
    // =========================================================================

    /**
     * @notice Get complete info for a handle by name
     */
    function getHandleInfo(string calldata name) external view returns (HandleInfo memory) {
        euint64 handle = _handles[name];
        uint256 rawHandle = uint256(euint64.unwrap(handle));
        return handleRegistry[rawHandle];
    }

    /**
     * @notice Get handle info by raw value
     */
    function getHandleInfoByRaw(uint256 rawHandle) external view returns (HandleInfo memory) {
        return handleRegistry[rawHandle];
    }

    /**
     * @notice Get all permission records for a handle
     */
    function getPermissionsForHandle(uint256 rawHandle) external view returns (PermissionRecord[] memory) {
        // Count permissions for this handle
        uint256 count = 0;
        for (uint256 i = 0; i < permissionLog.length; i++) {
            if (permissionLog[i].rawHandle == rawHandle) {
                count++;
            }
        }

        // Collect them
        PermissionRecord[] memory result = new PermissionRecord[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < permissionLog.length; i++) {
            if (permissionLog[i].rawHandle == rawHandle) {
                result[idx++] = permissionLog[i];
            }
        }

        return result;
    }

    /**
     * @notice Get child handles derived from a parent
     */
    function getChildHandles(uint256 parentRawHandle) external view returns (uint256[] memory) {
        // Count children
        uint256 count = 0;
        for (uint256 i = 1; i <= handleCount; i++) {
            uint256 rawHandle = handleById[i];
            HandleInfo storage info = handleRegistry[rawHandle];
            for (uint256 j = 0; j < info.parentHandles.length; j++) {
                if (info.parentHandles[j] == parentRawHandle) {
                    count++;
                    break;
                }
            }
        }

        // Collect children
        uint256[] memory children = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= handleCount; i++) {
            uint256 rawHandle = handleById[i];
            HandleInfo storage info = handleRegistry[rawHandle];
            for (uint256 j = 0; j < info.parentHandles.length; j++) {
                if (info.parentHandles[j] == parentRawHandle) {
                    children[idx++] = rawHandle;
                    break;
                }
            }
        }

        return children;
    }

    /**
     * @notice Get total permission count
     */
    function getPermissionCount() external view returns (uint256) {
        return permissionLog.length;
    }

    /**
     * @notice Get raw handle by name
     */
    function getRawHandle(string calldata name) external view returns (uint256) {
        return uint256(euint64.unwrap(_handles[name]));
    }

    // =========================================================================
    //                         INTERNAL FUNCTIONS
    // =========================================================================

    function _registerHandle(
        uint256 rawHandle,
        string memory name,
        HandleOrigin origin,
        uint256[] memory parents,
        string memory operationType
    ) internal {
        handleCount++;
        handleById[handleCount] = rawHandle;

        handleRegistry[rawHandle] = HandleInfo({
            rawHandle: rawHandle,
            name: name,
            origin: origin,
            parentHandles: parents,
            operationType: operationType,
            createdAt: block.timestamp,
            creator: msg.sender,
            state: HandleState.ACTIVE,
            decryptedValue: 0
        });

        emit HandleRegistered(rawHandle, name, origin, msg.sender);
    }

    function _recordPermission(
        uint256 rawHandle,
        address grantee,
        string memory permissionType
    ) internal {
        permissionLog.push(PermissionRecord({
            rawHandle: rawHandle,
            grantee: grantee,
            permissionType: permissionType,
            grantedAt: block.timestamp,
            grantedBy: msg.sender
        }));

        emit PermissionRecorded(rawHandle, grantee, permissionType);
    }
}
