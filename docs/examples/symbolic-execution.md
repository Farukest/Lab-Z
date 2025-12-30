# Symbolic Execution

🔴 **Advanced** | 🔑 Understanding Handles

Understanding the difference between mock mode testing and production FHE

## Overview

This advanced template demonstrates how FHEVM testing (mock mode) differs from production (real FHE). In mock mode, handles are 'symbolic' - they represent encrypted values without actual encryption, enabling fast testing. In production, handles reference real ciphertexts with cryptographic operations. Key differences covered: decryption timing (instant vs async), gas costs (minimal vs significant), random number behavior (deterministic vs cryptographically secure), and value inspection (possible vs opaque). Essential for writing testable code that works correctly in both environments.

## Quick Start

```bash
# Create new project from this template
npx labz create symbolic-execution my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title SymbolicExecution
 * @author FHEVM Tutorial
 * @notice Demonstrates how FHEVM testing differs from production execution
 *
 * ============================================================================
 *                       WHAT IS SYMBOLIC EXECUTION?
 * ============================================================================
 *
 * In FHEVM development, there are TWO execution modes:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │                        MOCK MODE (Testing)                         │
 *   ├─────────────────────────────────────────────────────────────────────┤
 *   │  - Used during local development and testing                       │
 *   │  - NO actual FHE encryption happens                                │
 *   │  - Handles are "symbolic" - they represent encrypted values        │
 *   │  - Operations are simulated, not cryptographically computed        │
 *   │  - FAST - no expensive crypto operations                           │
 *   │  - Values can be "peeked" for testing assertions                   │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │                    PRODUCTION MODE (Real FHE)                       │
 *   ├─────────────────────────────────────────────────────────────────────┤
 *   │  - Used on testnet/mainnet                                         │
 *   │  - ACTUAL FHE encryption with real cryptographic operations        │
 *   │  - Handles reference real encrypted data in coprocessor            │
 *   │  - Operations are cryptographically computed                       │
 *   │  - SLOW - expensive crypto operations                              │
 *   │  - Values CANNOT be peeked - true encryption                       │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * ============================================================================
 *                      WHY DOES THIS MATTER?
 * ============================================================================
 *
 * 1. TESTING ASSERTIONS
 *    In mock mode, you can verify encrypted values match expectations.
 *    In production, you can only verify through decryption requests.
 *
 * 2. GAS COSTS
 *    Mock mode has minimal gas costs for FHE operations.
 *    Production has significant gas costs for real crypto.
 *
 * 3. TIMING
 *    Mock mode is instant.
 *    Production operations take time for coprocessor.
 *
 * 4. DEBUGGING
 *    Mock mode allows inspection of encrypted values.
 *    Production is opaque - you can't see inside ciphertexts.
 *
 * ============================================================================
 *                      WRITING TESTABLE CODE
 * ============================================================================
 *
 * Good practices for code that works in both modes:
 *
 *   1. Use events for state tracking (work in both modes)
 *   2. Design for async decryption (production requirement)
 *   3. Don't rely on peeking values (mock-only feature)
 *   4. Test edge cases (both modes should behave identically)
 *
 * ============================================================================
 */
contract SymbolicExecution is ZamaEthereumConfig {

    // =========================================================================
    //                              EVENTS
    // =========================================================================

    /// @notice Emitted when a computation is performed
    event ComputationPerformed(
        string operation,
        bytes32 resultHandle
    );

    /// @notice Emitted when decryption completes
    event ValueDecrypted(
        string name,
        uint64 value
    );

    /// @notice Emitted for debugging in mock mode
    event DebugState(
        string message,
        bytes32 handleA,
        bytes32 handleB,
        bytes32 handleResult
    );

    // =========================================================================
    //                              STATE
    // =========================================================================

    /// @notice Stored encrypted values
    mapping(string => euint64) private _values;

    /// @notice Last decrypted result
    uint64 public lastDecryptedValue;

    /// @notice Pending decryption name
    string private _pendingDecryptionName;

    // =========================================================================
    //           DEMONSTRATION 1: BASIC OPERATIONS (Both Modes)
    // =========================================================================

    /**
     * @notice Store an encrypted value
     * @dev Works identically in mock and production modes.
     *
     * In MOCK mode:
     *   - The value is stored in a simulated encrypted format
     *   - No actual encryption happens
     *   - The "handle" is a symbolic reference
     *
     * In PRODUCTION mode:
     *   - The value is actually encrypted by the coprocessor
     *   - The handle references real ciphertext
     *   - Cryptographic operations are performed
     */
    function storeValue(string calldata name, uint64 value) external {
        euint64 encrypted = FHE.asEuint64(value);
        FHE.allowThis(encrypted);
        FHE.allow(encrypted, msg.sender);

        _values[name] = encrypted;

        emit ComputationPerformed("store", euint64.unwrap(encrypted));
    }

    /**
     * @notice Add two stored values
     * @dev The operation semantics are identical in both modes,
     * but the underlying implementation differs completely.
     */
    function addValues(
        string calldata nameA,
        string calldata nameB,
        string calldata resultName
    ) external {
        euint64 a = _values[nameA];
        euint64 b = _values[nameB];

        require(euint64.unwrap(a) != bytes32(0), "Value A not found");
        require(euint64.unwrap(b) != bytes32(0), "Value B not found");

        // This operation:
        // - MOCK: Simulates addition symbolically
        // - PRODUCTION: Performs homomorphic addition on ciphertexts
        euint64 result = FHE.add(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        _values[resultName] = result;

        emit ComputationPerformed("add", euint64.unwrap(result));
        emit DebugState(
            "add operation",
            euint64.unwrap(a),
            euint64.unwrap(b),
            euint64.unwrap(result)
        );
    }

    /**
     * @notice Compare two values
     * @dev Returns an encrypted boolean in both modes.
     */
    function compareValues(
        string calldata nameA,
        string calldata nameB
    ) external returns (ebool) {
        euint64 a = _values[nameA];
        euint64 b = _values[nameB];

        ebool result = FHE.gt(a, b);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        emit ComputationPerformed("compare", ebool.unwrap(result));

        return result;
    }

    // =========================================================================
    //           DEMONSTRATION 2: DECRYPTION (Mode Differences)
    // =========================================================================

    /**
     * @notice Request decryption of a value (STEP 1 of 3-step pattern)
     * @dev This is where mock and production modes differ most:
     *
     * MOCK MODE:
     *   - Decryption may be "instant" (simulated)
     *   - Values can be peeked without decryption for testing
     *
     * PRODUCTION MODE:
     *   - Decryption is async through SDK
     *   - Takes time for coprocessor to process
     *   - No way to peek values
     *
     * 3-STEP ASYNC PATTERN:
     *   1. Call this function to mark handle for decryption
     *   2. Off-chain: SDK calls fhevmInstance.publicDecrypt()
     *   3. Call finalizeDecryption() with proof
     */
    function requestDecryption(string calldata name) external {
        euint64 value = _values[name];
        require(euint64.unwrap(value) != bytes32(0), "Value not found");

        _pendingDecryptionName = name;

        // Mark handle for public decryption
        FHE.makePubliclyDecryptable(value);

        emit ComputationPerformed("decrypt_request", euint64.unwrap(value));
    }

    /**
     * @notice Get handle for off-chain decryption (STEP 2 helper)
     * @dev Client uses this to call fhevmInstance.publicDecrypt([handle])
     */
    function getHandleForDecryption(string calldata name) external view returns (bytes32) {
        return euint64.unwrap(_values[name]);
    }

    /**
     * @notice Finalize decryption with proof (STEP 3)
     * @dev Called by client after off-chain decryption completes
     *
     * MOCK: Proof verification is simulated
     * PRODUCTION: Cryptographic proof is verified on-chain
     */
    function finalizeDecryption(
        uint64 clearValue,
        bytes calldata decryptionProof
    ) external {
        // Build ciphertext array for verification
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(_values[_pendingDecryptionName]);

        // Build cleartext bytes for verification
        bytes memory cleartexts = abi.encode(clearValue);

        // Verify the decryption proof
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        lastDecryptedValue = clearValue;

        emit ValueDecrypted(_pendingDecryptionName, clearValue);

        _pendingDecryptionName = "";
    }

    // =========================================================================
    //           DEMONSTRATION 3: CONDITIONAL LOGIC (Both Modes)
    // =========================================================================

    /**
     * @notice Demonstrate FHE.select (encrypted conditional)
     * @dev This is the FHE equivalent of:
     *   result = condition ? valueIfTrue : valueIfFalse
     *
     * The condition, true value, and false value are ALL encrypted.
     * The result is also encrypted.
     *
     * MOCK: Simulates the selection
     * PRODUCTION: Homomorphic conditional evaluation
     */
    function conditionalSelect(
        string calldata conditionName,
        string calldata trueName,
        string calldata falseName,
        string calldata resultName
    ) external {
        euint64 trueVal = _values[trueName];
        euint64 falseVal = _values[falseName];

        // Create condition: is trueVal > falseVal?
        ebool condition = FHE.gt(trueVal, falseVal);

        // Select based on encrypted condition
        // If condition is true, pick trueVal; else pick falseVal
        euint64 result = FHE.select(condition, trueVal, falseVal);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        _values[resultName] = result;

        emit ComputationPerformed("select", euint64.unwrap(result));
    }

    // =========================================================================
    //           DEMONSTRATION 4: RANDOM NUMBERS (Mode Differences)
    // =========================================================================

    /**
     * @notice Generate a random encrypted number
     * @dev Random number generation differs between modes:
     *
     * MOCK MODE:
     *   - Uses a deterministic pseudo-random generator
     *   - Same seed produces same "random" values
     *   - Useful for reproducible tests
     *
     * PRODUCTION MODE:
     *   - Uses cryptographically secure randomness
     *   - Truly unpredictable values
     *   - Non-reproducible
     *
     * TESTING TIP: Don't rely on specific random values in tests.
     * Test the logic around randomness, not the values themselves.
     */
    function generateRandom(string calldata name) external {
        euint64 random = FHE.randEuint64();
        FHE.allowThis(random);
        FHE.allow(random, msg.sender);

        _values[name] = random;

        emit ComputationPerformed("random", euint64.unwrap(random));
    }

    // =========================================================================
    //           DEMONSTRATION 5: GAS CONSIDERATIONS
    // =========================================================================

    /**
     * @notice Perform multiple operations to demonstrate gas differences
     * @dev In MOCK mode, gas costs are minimal for FHE operations.
     * In PRODUCTION mode, each operation has significant gas cost.
     *
     * Operation approximate gas costs (production):
     *   - FHE.asEuint64:   ~100k gas
     *   - FHE.add:         ~150k gas
     *   - FHE.mul:         ~200k gas
     *   - FHE.eq/gt/lt:    ~150k gas
     *   - FHE.select:      ~180k gas
     *
     * These are estimates and vary by network conditions.
     *
     * TESTING TIP: Gas estimates from mock mode are NOT accurate
     * for production. Always test on testnet for real gas costs.
     */
    function multipleOperations(
        uint64 a,
        uint64 b,
        uint64 c
    ) external returns (uint256 gasUsed) {
        uint256 startGas = gasleft();

        euint64 encA = FHE.asEuint64(a);
        euint64 encB = FHE.asEuint64(b);
        euint64 encC = FHE.asEuint64(c);

        // Chain of operations
        euint64 sum = FHE.add(encA, encB);      // a + b
        euint64 product = FHE.mul(sum, encC);   // (a + b) * c
        ebool isLarge = FHE.gt(product, encA);  // result > a?

        euint64 result = FHE.select(isLarge, product, encA);
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        _values["multiOp"] = result;

        gasUsed = startGas - gasleft();

        emit ComputationPerformed("multiOp", euint64.unwrap(result));
    }

    // =========================================================================
    //                           UTILITIES
    // =========================================================================

    /**
     * @notice Check if a value exists
     */
    function hasValue(string calldata name) external view returns (bool) {
        return euint64.unwrap(_values[name]) != bytes32(0);
    }

    /**
     * @notice Get raw handle for a value
     */
    function getRawHandle(string calldata name) external view returns (bytes32) {
        return euint64.unwrap(_values[name]);
    }
}

```

## Code Explanation

### Basic Operations

Basic FHE operations that work identically in both mock and production modes. Shows store, add, and compare.

*Lines 95-150*

### Decryption Patterns

Demonstrates async decryption pattern. Critical difference: mock is instant, production takes multiple blocks.

*Lines 156-210*

### Conditional Logic

FHE.select for encrypted conditionals. Condition, true value, and false value are all encrypted.

*Lines 216-255*

### Random Numbers

Random number generation differs: mock is deterministic, production is cryptographically secure.

*Lines 261-290*

### Gas Considerations

Multiple operations to show gas differences. Mock gas is minimal; production has significant FHE costs.

*Lines 296-340*

## FHE Operations Used

- `FHE.FHE.asEuint64()`
- `FHE.FHE.add()`
- `FHE.FHE.mul()`
- `FHE.FHE.gt()`
- `FHE.FHE.select()`
- `FHE.FHE.randEuint64()`
- `FHE.FHE.allow()`
- `FHE.FHE.allowThis()`
- `FHE.FHE.makePubliclyDecryptable()`
- `FHE.FHE.checkSignatures()`

## FHE Types Used

- `euint64`
- `ebool`

## Tags

`symbolic` `mock` `production` `testing` `gas` `debugging` `best-practices`

## Related Examples

- [handle-journey](./handle-journey.md)
- [observatory](./observatory.md)

## Prerequisites

Before this example, you should understand:
- [handle-journey](./handle-journey.md)
- [handle-vs-value](./handle-vs-value.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
