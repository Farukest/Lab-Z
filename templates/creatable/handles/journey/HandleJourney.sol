// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HandleJourney
 * @author FHEVM Tutorial
 * @notice Educational contract demonstrating the complete lifecycle of FHE handles
 *
 * ============================================================================
 *                           WHAT IS A HANDLE?
 * ============================================================================
 *
 * In FHEVM, when you create an encrypted value like `euint64`, you're NOT
 * storing the actual encrypted data in your contract. Instead, you're storing
 * a 256-bit HANDLE - a reference to encrypted data in the coprocessor.
 *
 * Think of it like this:
 *
 *   ┌─────────────────┐         ┌─────────────────────────┐
 *   │  Your Contract  │         │      Coprocessor        │
 *   ├─────────────────┤         ├─────────────────────────┤
 *   │                 │  ref    │                         │
 *   │  euint64 val ───────────> │  [Actual Encrypted Data]│
 *   │  (= handle)     │         │                         │
 *   └─────────────────┘         └─────────────────────────┘
 *
 * ============================================================================
 *                          HANDLE LIFECYCLE
 * ============================================================================
 *
 *   1. BIRTH ──────> Handle is created
 *                    • From plaintext: FHE.asEuint64(100)
 *                    • From user input: FHE.fromExternal(input, proof)
 *                    • From operation: FHE.add(a, b)
 *
 *   2. PERMISSION ─> Handle needs ACL permissions
 *                    • FHE.allowThis() - contract can use it
 *                    • FHE.allow(handle, addr) - addr can use it
 *                    • FHE.allowTransient() - temporary, same tx only
 *
 *   3. OPERATION ──> Handle is used in FHE operations
 *                    • Each operation creates a NEW child handle
 *                    • Parent handles remain valid
 *                    • Child needs its own permissions
 *
 *   4. STORAGE ────> Handle persists in contract state
 *                    • Survives between transactions
 *                    • Can be retrieved and used later
 *
 *   5. DEATH ──────> Handle is decrypted (value revealed)
 *                    • Public decrypt: anyone can see
 *                    • User decrypt: only requester sees
 *                    • Once decrypted, value is no longer private
 *
 * ============================================================================
 */
contract HandleJourney is ZamaEthereumConfig {

    // =========================================================================
    //                              EVENTS
    // =========================================================================
    // These events let you trace the entire journey of a handle

    /// @notice A new handle was born into existence
    /// @param stage The lifecycle stage (1=birth, 2=permission, 3=operation, 4=storage, 5=death)
    /// @param description Human-readable description of what happened
    event LifecycleEvent(uint8 indexed stage, string description);

    /// @notice Detailed birth event with origin information
    event HandleBorn(string origin, string details);

    /// @notice Permission was granted on a handle
    event PermissionGranted(address indexed grantee, string permissionType);

    /// @notice A new handle was created from an operation
    event ChildHandleCreated(string operation, string details);

    /// @notice Handle was stored in contract state
    event HandleStored(string location);

    /// @notice Handle was decrypted - its value is now public
    event HandleDecrypted(uint64 revealedValue);

    // =========================================================================
    //                              STATE
    // =========================================================================

    /// @notice The main encrypted value we're tracking
    euint64 private _trackedHandle;

    /// @notice Result of the last decryption
    uint64 public lastRevealedValue;

    /// @notice Counter to demonstrate operations creating new handles
    euint64 private _operationResult;

    // =========================================================================
    //                    STAGE 1: BIRTH - Handle Creation
    // =========================================================================

    /**
     * @notice Create a handle from a plaintext value
     * @dev The simplest way to create a handle. The plaintext is encrypted
     * by the coprocessor and a handle is returned.
     *
     * IMPORTANT: Even though you pass a plaintext, the resulting handle
     * references ENCRYPTED data. The plaintext never leaves this transaction.
     *
     * @param value The plaintext value to encrypt
     */
    function stage1_birthFromPlaintext(uint64 value) external {
        // HANDLE IS BORN HERE
        // FHE.asEuint64() takes a plaintext and returns a handle to encrypted data
        _trackedHandle = FHE.asEuint64(value);

        emit LifecycleEvent(1, "Handle born from plaintext");
        emit HandleBorn("plaintext", "Created via FHE.asEuint64()");

        // Immediately move to stage 2 - grant permission to this contract
        FHE.allowThis(_trackedHandle);
        emit LifecycleEvent(2, "Permission granted to contract");
        emit PermissionGranted(address(this), "allowThis");
    }

    /**
     * @notice Create a handle from encrypted user input
     * @dev This is how users submit encrypted values from the frontend.
     *
     * The flow is:
     * 1. User encrypts value client-side using fhevmjs
     * 2. User sends encrypted ciphertext + proof to contract
     * 3. Contract calls FHE.fromExternal() to create a handle
     * 4. Coprocessor verifies the proof and stores the encrypted data
     *
     * @param encryptedInput The encrypted value from the user
     * @param inputProof Proof that the encryption is valid
     */
    function stage1_birthFromUserInput(
        externalEuint64 encryptedInput,
        bytes calldata inputProof
    ) external {
        // HANDLE IS BORN HERE
        // FHE.fromExternal() verifies the proof and creates a handle
        _trackedHandle = FHE.fromExternal(encryptedInput, inputProof);

        emit LifecycleEvent(1, "Handle born from user input");
        emit HandleBorn("user_input", "Created via FHE.fromExternal()");

        // Grant permissions
        FHE.allowThis(_trackedHandle);
        FHE.allow(_trackedHandle, msg.sender);

        emit LifecycleEvent(2, "Permissions granted");
        emit PermissionGranted(address(this), "allowThis");
        emit PermissionGranted(msg.sender, "allow (permanent)");
    }

    // =========================================================================
    //                 STAGE 2: PERMISSION - Access Control
    // =========================================================================

    /**
     * @notice Grant permanent permission to an address
     * @dev Permanent permissions persist across transactions.
     * The grantee can use this handle in any future transaction.
     *
     * @param grantee Address to grant permission to
     */
    function stage2_grantPermanentPermission(address grantee) external {
        require(euint64.unwrap(_trackedHandle) != bytes32(0), "No handle to grant permission on");

        // Grant permanent permission
        FHE.allow(_trackedHandle, grantee);

        emit LifecycleEvent(2, "Permanent permission granted");
        emit PermissionGranted(grantee, "allow (permanent)");
    }

    /**
     * @notice Grant transient permission to an address
     * @dev Transient permissions are valid ONLY for the current transaction.
     *
     * Use case: Passing a handle to another contract that will use it
     * immediately in the same transaction.
     *
     * @param grantee Address to grant temporary permission to
     */
    function stage2_grantTransientPermission(address grantee) external {
        require(euint64.unwrap(_trackedHandle) != bytes32(0), "No handle to grant permission on");

        // Grant transient permission - expires at end of transaction
        FHE.allowTransient(_trackedHandle, grantee);

        emit LifecycleEvent(2, "Transient permission granted (this tx only)");
        emit PermissionGranted(grantee, "allowTransient (expires after tx)");
    }

    // =========================================================================
    //              STAGE 3: OPERATION - Creating Child Handles
    // =========================================================================

    /**
     * @notice Add a value to the tracked handle
     * @dev CRITICAL CONCEPT: FHE operations create NEW handles!
     *
     * When you call FHE.add(a, b), you get a COMPLETELY NEW handle.
     * The original handles (a and b) still exist and are unchanged.
     * The new handle needs its OWN permissions.
     *
     *   Parent Handle A ─┐
     *                    ├──> FHE.add() ──> NEW Child Handle
     *   Parent Handle B ─┘
     *
     * @param addValue Value to add (will be encrypted internally)
     */
    function stage3_operationAdd(uint64 addValue) external {
        require(euint64.unwrap(_trackedHandle) != bytes32(0), "No handle to operate on");

        // Create an encrypted value for the addition
        euint64 addHandle = FHE.asEuint64(addValue);

        // CHILD HANDLE IS BORN HERE
        // This is a completely new handle, not a modification of _trackedHandle
        _operationResult = FHE.add(_trackedHandle, addHandle);

        // Child handle needs its own permissions!
        FHE.allowThis(_operationResult);

        emit LifecycleEvent(3, "Child handle created from add operation");
        emit ChildHandleCreated("FHE.add", "New handle = parent + addValue");
        emit PermissionGranted(address(this), "allowThis on child");
    }

    /**
     * @notice Multiply the tracked handle by a value
     * @dev Another example showing that operations create new handles
     */
    function stage3_operationMultiply(uint64 mulValue) external {
        require(euint64.unwrap(_trackedHandle) != bytes32(0), "No handle to operate on");

        euint64 mulHandle = FHE.asEuint64(mulValue);

        // Another new child handle
        _operationResult = FHE.mul(_trackedHandle, mulHandle);
        FHE.allowThis(_operationResult);

        emit LifecycleEvent(3, "Child handle created from multiply operation");
        emit ChildHandleCreated("FHE.mul", "New handle = parent * mulValue");
    }

    /**
     * @notice Compare the tracked handle to a value
     * @dev Comparisons create ebool handles - still handles, just boolean type
     */
    function stage3_operationCompare(uint64 compareValue) external returns (ebool) {
        require(euint64.unwrap(_trackedHandle) != bytes32(0), "No handle to operate on");

        euint64 compareHandle = FHE.asEuint64(compareValue);

        // This creates an ebool handle (encrypted boolean)
        ebool result = FHE.gt(_trackedHandle, compareHandle);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        emit LifecycleEvent(3, "ebool child handle created from comparison");
        emit ChildHandleCreated("FHE.gt", "New ebool handle = parent > compareValue");

        return result;
    }

    // =========================================================================
    //                   STAGE 4: STORAGE - Persistence
    // =========================================================================

    /**
     * @notice Promote operation result to be the tracked handle
     * @dev Handles stored in contract state persist between transactions.
     *
     * This is how you maintain encrypted state across multiple calls.
     */
    function stage4_storeOperationResult() external {
        require(euint64.unwrap(_operationResult) != bytes32(0), "No operation result to store");

        // The handle persists in storage
        _trackedHandle = _operationResult;

        emit LifecycleEvent(4, "Handle stored in contract state");
        emit HandleStored("_trackedHandle");
    }

    // =========================================================================
    //                     STAGE 5: DEATH - Decryption (3-Step Async Pattern)
    // =========================================================================

    /**
     * @notice Request public decryption of the tracked handle
     * @dev This is the "death" of a handle - once decrypted, the value is public.
     *
     * 3-STEP ASYNC DECRYPTION PATTERN:
     *
     * STEP 1 (on-chain): Mark handle for public decryption
     *   Call this function - it calls FHE.makePubliclyDecryptable()
     *
     * STEP 2 (off-chain): Client requests decryption from SDK
     *   const handle = await contract.getHandleForDecryption();
     *   const result = await fhevmInstance.publicDecrypt([handle]);
     *
     * STEP 3 (on-chain): Finalize with proof verification
     *   Call stage5_finalizeDecryption() with the proof from Step 2
     */
    function stage5_requestDecryption() external {
        require(euint64.unwrap(_trackedHandle) != bytes32(0), "No handle to decrypt");

        // STEP 1: Mark for public decryption
        FHE.makePubliclyDecryptable(_trackedHandle);

        emit LifecycleEvent(5, "Decryption requested - handle marked for reveal");
    }

    /**
     * @notice Get the handle for off-chain decryption (STEP 2 helper)
     * @dev Client uses this to call fhevmInstance.publicDecrypt([handle])
     */
    function getHandleForDecryption() external view returns (bytes32) {
        return euint64.unwrap(_trackedHandle);
    }

    /**
     * @notice Finalize decryption with proof (STEP 3)
     * @dev Called by client after off-chain decryption completes
     *
     * At this point, the handle has "died" - its value is now public.
     */
    function stage5_finalizeDecryption(
        uint64 clearValue,
        bytes calldata decryptionProof
    ) external {
        // Build ciphertext array for verification
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(_trackedHandle);

        // Build cleartext bytes for verification
        bytes memory cleartexts = abi.encode(clearValue);

        // Verify the decryption proof
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Store the revealed value
        lastRevealedValue = clearValue;

        emit LifecycleEvent(5, "Handle has died - value revealed");
        emit HandleDecrypted(clearValue);
    }

    // =========================================================================
    //                           UTILITIES
    // =========================================================================

    /**
     * @notice Check if we have an active tracked handle
     */
    function hasActiveHandle() external view returns (bool) {
        return euint64.unwrap(_trackedHandle) != bytes32(0);
    }

    /**
     * @notice Get the raw handle value (for educational purposes)
     * @dev This shows that handles are just 256-bit integers (stored as bytes32)
     */
    function getHandleRaw() external view returns (bytes32) {
        return euint64.unwrap(_trackedHandle);
    }
}
