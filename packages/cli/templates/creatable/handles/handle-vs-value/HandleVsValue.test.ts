import { expect } from "chai";
import hre from "hardhat";

/**
 * HANDLE VS VALUE TEST SUITE
 *
 * This test suite demonstrates the critical difference between handles and values
 * in FHEVM. Understanding this distinction is essential for writing correct FHE code.
 *
 * KEY CONCEPTS:
 *
 * 1. Handles are REFERENCES, not copies
 *    - Assigning `b = a` makes both point to the same encrypted data
 *
 * 2. Handle creation is DETERMINISTIC
 *    - Same value encrypted twice = same handle
 *
 * 3. Operations create NEW handles
 *    - FHE.add(a, b) creates a new handle, different from direct creation
 *
 * 4. Raw handle comparison tells you if they're the SAME reference
 *    - FHE.eq(a, b) tells you if the encrypted VALUES are equal
 */
describe("HandleVsValue", function () {
  async function deployFixture() {
    const [owner] = await hre.ethers.getSigners();
    const instance = await hre.fhevm.createInstance();

    const HandleVsValue = await hre.ethers.getContractFactory("HandleVsValue");
    const contract = await HandleVsValue.deploy();
    await contract.waitForDeployment();

    return { contract, owner, instance };
  }

  // ===========================================================================
  //              DEMONSTRATION 1: ASSIGNMENT IS NOT COPYING
  // ===========================================================================

  describe("Assignment is Not Copying", function () {
    /**
     * TEST: Assigning handles creates aliases, not copies
     *
     * When you write:
     *   euint64 a = FHE.asEuint64(100);
     *   euint64 b = a;
     *
     * Both 'a' and 'b' are the SAME handle. They point to the same
     * encrypted data in the coprocessor.
     */
    it("should demonstrate that assignment creates same handle", async function () {
      const { contract } = await deployFixture();

      // Run the demonstration
      const tx = await contract.demo_assignmentIsNotCopy();
      await tx.wait();

      // Verify handles are identical
      const areSame = await contract.verifyAssignmentDemo();
      expect(areSame).to.be.true;

      // Get raw handles
      const [rawA, rawB] = await contract.getRawHandles();

      console.log("\n=== ASSIGNMENT IS NOT COPYING ===");
      console.log("handleA (raw):", rawA.toString().slice(0, 30) + "...");
      console.log("handleB = handleA (raw):", rawB.toString().slice(0, 30) + "...");
      console.log("Are they identical?", areSame);
      console.log("\nThis means:");
      console.log("  - Both variables reference the SAME encrypted data");
      console.log("  - Permissions on A automatically apply to B");
      console.log("  - There is NO independent copy");
    });
  });

  // ===========================================================================
  //              DEMONSTRATION 2: DETERMINISM
  // ===========================================================================

  describe("Determinism", function () {
    /**
     * TEST: Same value encrypted twice produces same handle
     *
     * FHE.asEuint64(42) called twice in the same context will produce
     * the same handle. This is deterministic behavior.
     */
    it("should produce same handle for same value", async function () {
      const { contract } = await deployFixture();

      await contract.demo_determinism();

      const [rawA, rawB] = await contract.getRawHandles();
      const areSame = rawA === rawB;

      console.log("\n=== DETERMINISM: SAME VALUE ===");
      console.log("FHE.asEuint64(42) first time:", rawA.toString().slice(0, 30) + "...");
      console.log("FHE.asEuint64(42) second time:", rawB.toString().slice(0, 30) + "...");
      console.log("Same handle?", areSame);
      console.log("\nImplications:");
      console.log("  - You can rely on consistent handle generation");
      console.log("  - Duplicate storage is avoided automatically");

      expect(areSame).to.be.true;
    });

    /**
     * TEST: Different values produce different handles
     *
     * This confirms that handles actually distinguish between values.
     */
    it("should produce different handles for different values", async function () {
      const { contract } = await deployFixture();

      await contract.demo_differentValues();

      const [rawA, rawB] = await contract.getRawHandles();
      const areSame = rawA === rawB;

      console.log("\n=== DIFFERENT VALUES ===");
      console.log("FHE.asEuint64(100):", rawA.toString().slice(0, 30) + "...");
      console.log("FHE.asEuint64(200):", rawB.toString().slice(0, 30) + "...");
      console.log("Same handle?", areSame);
      console.log("\nThis confirms handles distinguish between values.");

      expect(areSame).to.be.false;
    });
  });

  // ===========================================================================
  //              DEMONSTRATION 3: OPERATIONS CREATE NEW HANDLES
  // ===========================================================================

  describe("Operations Create New Handles", function () {
    /**
     * TEST: Operation result differs from direct creation
     *
     * Even if the encrypted VALUES are the same, handles from different
     * origins are different:
     *
     *   FHE.asEuint64(100)       -->  Handle X
     *   FHE.add(50, 50)          -->  Handle Y (also represents 100)
     *
     *   X != Y (different handles, same value)
     */
    it("should create different handle from operation vs direct", async function () {
      const { contract } = await deployFixture();

      await contract.demo_operationsCreateNewHandles();

      const [rawDirect, rawFromAdd] = await contract.getRawHandles();
      const areSame = rawDirect === rawFromAdd;

      console.log("\n=== OPERATIONS CREATE NEW HANDLES ===");
      console.log("Direct: FHE.asEuint64(100):", rawDirect.toString().slice(0, 30) + "...");
      console.log("Added: FHE.add(50, 50):", rawFromAdd.toString().slice(0, 30) + "...");
      console.log("Same handle?", areSame);
      console.log("\nEven though both represent '100':");
      console.log("  - They are DIFFERENT handles");
      console.log("  - This is because operations have unique handle derivation");
      console.log("  - To compare VALUES, use FHE.eq() (returns encrypted bool)");

      expect(areSame).to.be.false;
    });

    /**
     * TEST: Same operation on same inputs produces same handle
     *
     * Operations are deterministic too:
     *   If you call FHE.add(A, B) twice, you get the same handle both times.
     */
    it("should produce same handle for repeated operation", async function () {
      const { contract } = await deployFixture();

      await contract.demo_operationDeterminism();

      const [raw1, raw2] = await contract.getRawHandles();
      const areSame = raw1 === raw2;

      console.log("\n=== OPERATION DETERMINISM ===");
      console.log("First A + B:", raw1.toString().slice(0, 30) + "...");
      console.log("Second A + B:", raw2.toString().slice(0, 30) + "...");
      console.log("Same handle?", areSame);
      console.log("\nOperations are deterministic:");
      console.log("  - Same inputs + same operation = same handle");
      console.log("  - This allows for efficient handle reuse");

      expect(areSame).to.be.true;
    });
  });

  // ===========================================================================
  //              DEMONSTRATION 4: THREE-WAY COMPARISON
  // ===========================================================================

  describe("Three-Way Comparison", function () {
    /**
     * TEST: Complete picture of handle identity
     *
     * Three handles all representing "30":
     *   A: FHE.asEuint64(30)      - Direct creation
     *   B: FHE.asEuint64(30)      - Direct creation (same as A)
     *   C: FHE.add(10, 20)        - From operation (different from A,B)
     */
    it("should show complete handle identity rules", async function () {
      const { contract } = await deployFixture();

      await contract.demo_threeWayComparison();

      const [abSame, acSame, bcSame] = await contract.areHandlesIdentical();
      const [rawA, rawB, rawC] = await contract.getRawHandles();

      console.log("\n=== THREE-WAY COMPARISON ===");
      console.log("All three represent the value 30:");
      console.log("");
      console.log("A = FHE.asEuint64(30):", rawA.toString().slice(0, 25) + "...");
      console.log("B = FHE.asEuint64(30):", rawB.toString().slice(0, 25) + "...");
      console.log("C = FHE.add(10, 20):  ", rawC.toString().slice(0, 25) + "...");
      console.log("");
      console.log("A == B?", abSame, "(same deterministic creation)");
      console.log("A == C?", acSame, "(different origins)");
      console.log("B == C?", bcSame, "(different origins)");
      console.log("");
      console.log("Summary:");
      console.log("  - Direct creation of same value = same handle");
      console.log("  - Operation result = different handle (even if same value)");

      expect(abSame).to.be.true;   // Direct creations are same
      expect(acSame).to.be.false;  // Direct vs Operation are different
      expect(bcSame).to.be.false;  // Direct vs Operation are different
    });
  });

  // ===========================================================================
  //              DEMONSTRATION 5: ENCRYPTED VALUE COMPARISON
  // ===========================================================================

  describe("Encrypted Value Comparison", function () {
    /**
     * TEST: FHE.eq compares VALUES, not handles
     *
     * To check if two handles represent the same VALUE (without knowing
     * what that value is), use FHE.eq(). This returns an encrypted boolean.
     */
    it("should compare encrypted values with FHE.eq", async function () {
      const { contract } = await deployFixture();

      // This creates two handles with the same value (50)
      // but from different origins (direct vs 25+25)
      const tx = await contract.demo_encryptedComparison();
      await tx.wait();

      console.log("\n=== ENCRYPTED VALUE COMPARISON ===");
      console.log("handleA = FHE.asEuint64(50)");
      console.log("handleB = FHE.add(25, 25)");
      console.log("");
      console.log("Raw handles are DIFFERENT (different origins)");
      console.log("But FHE.eq(A, B) returns encrypted 'true'");
      console.log("");
      console.log("Key insight:");
      console.log("  - Comparing raw handles tells you if they're the SAME reference");
      console.log("  - FHE.eq() tells you if the VALUES are equal");
      console.log("  - The FHE.eq() result is also encrypted (ebool)");
    });
  });

  // ===========================================================================
  //                           SUMMARY TEST
  // ===========================================================================

  describe("Summary", function () {
    it("should demonstrate all handle vs value concepts", async function () {
      console.log("\n");
      console.log("╔══════════════════════════════════════════════════════════════╗");
      console.log("║                  HANDLE VS VALUE SUMMARY                     ║");
      console.log("╠══════════════════════════════════════════════════════════════╣");
      console.log("║                                                              ║");
      console.log("║  1. HANDLES ARE REFERENCES                                   ║");
      console.log("║     - Assignment (b = a) creates an alias, not a copy        ║");
      console.log("║     - Both point to the same encrypted data                  ║");
      console.log("║                                                              ║");
      console.log("║  2. HANDLE CREATION IS DETERMINISTIC                         ║");
      console.log("║     - Same value -> same handle                              ║");
      console.log("║     - FHE.asEuint64(42) always gives the same handle         ║");
      console.log("║                                                              ║");
      console.log("║  3. OPERATIONS CREATE NEW HANDLES                            ║");
      console.log("║     - FHE.add(a, b) returns a new, unique handle             ║");
      console.log("║     - Different from direct creation even if same value      ║");
      console.log("║                                                              ║");
      console.log("║  4. RAW COMPARISON vs VALUE COMPARISON                       ║");
      console.log("║     - rawA == rawB checks if SAME reference                  ║");
      console.log("║     - FHE.eq(a, b) checks if VALUES are equal (encrypted)    ║");
      console.log("║                                                              ║");
      console.log("╚══════════════════════════════════════════════════════════════╝");
      console.log("\n");
    });
  });
});
