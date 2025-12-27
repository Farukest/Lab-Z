// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HandleVsValue
 * @author FHEVM Tutorial
 * @notice Demonstrates that FHE handles are REFERENCES, not values
 *
 * ============================================================================
 *                      HANDLES ARE NOT VALUES
 * ============================================================================
 *
 * In regular Solidity:
 *
 *   uint256 a = 100;
 *   uint256 b = a;      // b is a COPY of a's value
 *   a = 200;            // changing a doesn't affect b
 *   // a == 200, b == 100
 *
 * In FHEVM:
 *
 *   euint64 a = FHE.asEuint64(100);
 *   euint64 b = a;      // b is the SAME HANDLE as a (not a copy!)
 *   // Both a and b point to the same encrypted data
 *
 * ============================================================================
 *                         HANDLE DETERMINISM
 * ============================================================================
 *
 * Handles are DETERMINISTIC - the same operation on the same inputs
 * produces the same handle:
 *
 *   euint64 x = FHE.asEuint64(100);
 *   euint64 y = FHE.asEuint64(100);
 *   // x and y are the SAME HANDLE!
 *
 * This is because the coprocessor uses deterministic encryption based on
 * the contract address, operation, and inputs.
 *
 * ============================================================================
 *                     WHY DOES THIS MATTER?
 * ============================================================================
 *
 * 1. STORAGE EFFICIENCY
 *    Same encrypted value = same storage slot reference
 *
 * 2. PERMISSION SHARING
 *    If you allow access to handle A, and B == A, then B is also accessible
 *
 * 3. EQUALITY CHECKING
 *    You can check if two handles reference the same encrypted data
 *    by comparing the raw 256-bit values
 *
 * 4. AVOIDING CONFUSION
 *    Don't expect "copying" a handle to create a new encrypted value
 *
 * ============================================================================
 */
contract HandleVsValue is ZamaEthereumConfig {

    // =========================================================================
    //                              EVENTS
    // =========================================================================

    /// @notice Logs handle values for educational comparison
    event HandleComparison(
        string description,
        bytes32 handleA,
        bytes32 handleB,
        bool areSameHandle
    );

    /// @notice Logs when handles are created
    event HandleCreated(string name, bytes32 rawHandle);

    // =========================================================================
    //                              STATE
    // =========================================================================

    euint64 public storedHandleA;
    euint64 public storedHandleB;
    euint64 public storedHandleC;

    // =========================================================================
    //               DEMONSTRATION 1: ASSIGNMENT IS NOT COPYING
    // =========================================================================

    /**
     * @notice Demonstrates that assigning handles doesn't create copies
     * @dev When you write `b = a`, both variables reference the SAME handle.
     *
     * This is different from regular integers where assignment copies values.
     *
     * IMPORTANT: This means if you have permission on handle A, and B = A,
     * you automatically have permission on B (because it's the same handle).
     */
    function demo_assignmentIsNotCopy() external {
        // Create a handle
        euint64 handleA = FHE.asEuint64(100);
        FHE.allowThis(handleA);

        // "Copy" the handle - but this is NOT a copy!
        euint64 handleB = handleA;

        // Get raw handle values
        bytes32 rawA = euint64.unwrap(handleA);
        bytes32 rawB = euint64.unwrap(handleB);

        // They are IDENTICAL - same handle
        bool areSame = (rawA == rawB);

        emit HandleCreated("handleA", rawA);
        emit HandleCreated("handleB (assigned from A)", rawB);
        emit HandleComparison(
            "Assignment: handleB = handleA",
            rawA,
            rawB,
            areSame  // This will be TRUE
        );

        // Store for external verification
        storedHandleA = handleA;
        storedHandleB = handleB;
    }

    /**
     * @notice Verify that stored handles are the same
     * @return areSame Whether the two handles are identical
     */
    function verifyAssignmentDemo() external view returns (bool areSame) {
        return euint64.unwrap(storedHandleA) == euint64.unwrap(storedHandleB);
    }

    // =========================================================================
    //              DEMONSTRATION 2: DETERMINISM - SAME VALUE = SAME HANDLE
    // =========================================================================

    /**
     * @notice Demonstrates that creating the same value twice gives the same handle
     * @dev The coprocessor uses deterministic encryption. Same input + same
     * context = same ciphertext = same handle.
     *
     * This is a key property for efficiency and reasoning about encrypted data.
     */
    function demo_determinism() external {
        // Create two handles from the same value
        euint64 handleA = FHE.asEuint64(42);
        euint64 handleB = FHE.asEuint64(42);

        FHE.allowThis(handleA);
        FHE.allowThis(handleB);

        bytes32 rawA = euint64.unwrap(handleA);
        bytes32 rawB = euint64.unwrap(handleB);

        // They are the SAME handle!
        bool areSame = (rawA == rawB);

        emit HandleCreated("handleA = FHE.asEuint64(42)", rawA);
        emit HandleCreated("handleB = FHE.asEuint64(42)", rawB);
        emit HandleComparison(
            "Determinism: same value twice",
            rawA,
            rawB,
            areSame  // This will be TRUE
        );

        storedHandleA = handleA;
        storedHandleB = handleB;
    }

    /**
     * @notice Demonstrates that different values produce different handles
     * @dev This confirms that handles actually represent different encrypted values
     */
    function demo_differentValues() external {
        euint64 handleA = FHE.asEuint64(100);
        euint64 handleB = FHE.asEuint64(200);

        FHE.allowThis(handleA);
        FHE.allowThis(handleB);

        bytes32 rawA = euint64.unwrap(handleA);
        bytes32 rawB = euint64.unwrap(handleB);

        // They are DIFFERENT handles
        bool areSame = (rawA == rawB);

        emit HandleCreated("handleA = FHE.asEuint64(100)", rawA);
        emit HandleCreated("handleB = FHE.asEuint64(200)", rawB);
        emit HandleComparison(
            "Different values: 100 vs 200",
            rawA,
            rawB,
            areSame  // This will be FALSE
        );

        storedHandleA = handleA;
        storedHandleB = handleB;
    }

    // =========================================================================
    //           DEMONSTRATION 3: OPERATIONS CREATE NEW HANDLES
    // =========================================================================

    /**
     * @notice Demonstrates that operations create NEW handles
     * @dev Even if the result equals an existing value, the handle is different
     * because operations produce unique handles based on their inputs.
     *
     *   FHE.asEuint64(100)           --> Handle X
     *   FHE.add(FHE.asEuint64(50), FHE.asEuint64(50))  --> Handle Y
     *
     *   Even though both encrypt "100", X != Y because they came from
     *   different operations.
     */
    function demo_operationsCreateNewHandles() external {
        // Create 100 directly
        euint64 handleDirect = FHE.asEuint64(100);
        FHE.allowThis(handleDirect);

        // Create 100 via addition: 50 + 50
        euint64 fifty1 = FHE.asEuint64(50);
        euint64 fifty2 = FHE.asEuint64(50);
        euint64 handleFromAdd = FHE.add(fifty1, fifty2);
        FHE.allowThis(handleFromAdd);

        bytes32 rawDirect = euint64.unwrap(handleDirect);
        bytes32 rawFromAdd = euint64.unwrap(handleFromAdd);

        // They are DIFFERENT handles (even though both represent 100)
        bool areSame = (rawDirect == rawFromAdd);

        emit HandleCreated("handleDirect = FHE.asEuint64(100)", rawDirect);
        emit HandleCreated("handleFromAdd = 50 + 50", rawFromAdd);
        emit HandleComparison(
            "Direct vs Operation: both are 100",
            rawDirect,
            rawFromAdd,
            areSame  // This will be FALSE
        );

        storedHandleA = handleDirect;
        storedHandleB = handleFromAdd;
    }

    // =========================================================================
    //              DEMONSTRATION 4: OPERATION DETERMINISM
    // =========================================================================

    /**
     * @notice Demonstrates that the same operation on same inputs = same handle
     * @dev Operations are also deterministic. If you add A + B twice,
     * you get the same resulting handle.
     */
    function demo_operationDeterminism() external {
        euint64 baseA = FHE.asEuint64(10);
        euint64 baseB = FHE.asEuint64(20);
        FHE.allowThis(baseA);
        FHE.allowThis(baseB);

        // Perform the same operation twice
        euint64 result1 = FHE.add(baseA, baseB);
        euint64 result2 = FHE.add(baseA, baseB);
        FHE.allowThis(result1);
        FHE.allowThis(result2);

        bytes32 raw1 = euint64.unwrap(result1);
        bytes32 raw2 = euint64.unwrap(result2);

        // Same operation, same inputs = same handle
        bool areSame = (raw1 == raw2);

        emit HandleCreated("result1 = A + B", raw1);
        emit HandleCreated("result2 = A + B (same operation)", raw2);
        emit HandleComparison(
            "Operation determinism: A+B done twice",
            raw1,
            raw2,
            areSame  // This will be TRUE
        );

        storedHandleA = result1;
        storedHandleB = result2;
    }

    // =========================================================================
    //            DEMONSTRATION 5: THREE-WAY COMPARISON
    // =========================================================================

    /**
     * @notice Compare three handles from different sources
     * @dev Shows the full picture of handle identity
     */
    function demo_threeWayComparison() external {
        // Three ways to represent "30"
        euint64 directThirty = FHE.asEuint64(30);
        euint64 anotherDirectThirty = FHE.asEuint64(30);
        euint64 addedThirty = FHE.add(FHE.asEuint64(10), FHE.asEuint64(20));

        FHE.allowThis(directThirty);
        FHE.allowThis(anotherDirectThirty);
        FHE.allowThis(addedThirty);

        bytes32 rawDirect1 = euint64.unwrap(directThirty);
        bytes32 rawDirect2 = euint64.unwrap(anotherDirectThirty);
        bytes32 rawAdded = euint64.unwrap(addedThirty);

        emit HandleCreated("directThirty", rawDirect1);
        emit HandleCreated("anotherDirectThirty", rawDirect2);
        emit HandleCreated("addedThirty (10+20)", rawAdded);

        // Direct creations are the same
        emit HandleComparison(
            "Direct vs Direct",
            rawDirect1,
            rawDirect2,
            rawDirect1 == rawDirect2  // TRUE - same deterministic creation
        );

        // Direct vs Operation are different
        emit HandleComparison(
            "Direct vs Added",
            rawDirect1,
            rawAdded,
            rawDirect1 == rawAdded  // FALSE - different origins
        );

        storedHandleA = directThirty;
        storedHandleB = anotherDirectThirty;
        storedHandleC = addedThirty;
    }

    // =========================================================================
    //                           UTILITIES
    // =========================================================================

    /**
     * @notice Get raw handle values for external comparison
     */
    function getRawHandles() external view returns (bytes32 a, bytes32 b, bytes32 c) {
        return (
            euint64.unwrap(storedHandleA),
            euint64.unwrap(storedHandleB),
            euint64.unwrap(storedHandleC)
        );
    }

    /**
     * @notice Check if two stored handles are identical
     */
    function areHandlesIdentical() external view returns (bool abSame, bool acSame, bool bcSame) {
        bytes32 a = euint64.unwrap(storedHandleA);
        bytes32 b = euint64.unwrap(storedHandleB);
        bytes32 c = euint64.unwrap(storedHandleC);

        return (a == b, a == c, b == c);
    }

    /**
     * @notice Demonstrates that comparing handles is NOT the same as comparing values
     * @dev This creates an encrypted comparison - the result is also encrypted!
     *
     * To compare if two HANDLES represent the same VALUE (without knowing
     * what the value is), you need FHE.eq() which returns ebool.
     */
    function demo_encryptedComparison() external returns (ebool) {
        // Two handles that represent the same value
        euint64 handleA = FHE.asEuint64(50);
        euint64 handleB = FHE.add(FHE.asEuint64(25), FHE.asEuint64(25));

        FHE.allowThis(handleA);
        FHE.allowThis(handleB);

        // Their RAW handles are DIFFERENT (different origins)
        // But their ENCRYPTED VALUES are EQUAL

        // This is an ENCRYPTED comparison - result is encrypted
        ebool areValuesEqual = FHE.eq(handleA, handleB);
        FHE.allowThis(areValuesEqual);
        FHE.allow(areValuesEqual, msg.sender);

        // areValuesEqual is a HANDLE to an encrypted boolean (true)
        // You'd need to decrypt it to see the result

        return areValuesEqual;
    }
}
