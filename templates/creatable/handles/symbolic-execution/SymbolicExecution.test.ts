import { expect } from "chai";
import hre from "hardhat";

/**
 * SYMBOLIC EXECUTION TEST SUITE
 *
 * This test suite demonstrates the differences between mock mode (testing)
 * and production mode (real FHE) in FHEVM development.
 *
 * Note: Decryption tests are simplified as they require Gateway/KMS in production.
 */
describe("SymbolicExecution", function () {
  async function deployFixture() {
    const [owner] = await hre.ethers.getSigners();

    const SymbolicExecution = await hre.ethers.getContractFactory("SymbolicExecution");
    const contract = await SymbolicExecution.deploy();
    await contract.waitForDeployment();

    return { contract, owner };
  }

  // ===========================================================================
  //                    BASIC OPERATIONS (Both Modes)
  // ===========================================================================

  describe("Basic Operations", function () {
    it("should store values (works in both modes)", async function () {
      const { contract } = await deployFixture();

      await contract.storeValue("secret", 42n);

      const exists = await contract.hasValue("secret");
      const handle = await contract.getRawHandle("secret");

      console.log("\n=== STORE VALUE ===");
      console.log("Value stored: 42");
      console.log("Handle created:", handle.slice(0, 30) + "...");
      console.log("Exists:", exists);

      expect(exists).to.be.true;
      expect(handle).to.not.equal("0x" + "0".repeat(64));
    });

    it("should add values (works in both modes)", async function () {
      const { contract } = await deployFixture();

      await contract.storeValue("a", 100n);
      await contract.storeValue("b", 50n);
      await contract.addValues("a", "b", "sum");

      const sumExists = await contract.hasValue("sum");

      console.log("\n=== ADD VALUES ===");
      console.log("a = 100, b = 50");
      console.log("sum = a + b (encrypted)");

      expect(sumExists).to.be.true;
    });

    it("should compare values (works in both modes)", async function () {
      const { contract } = await deployFixture();

      await contract.storeValue("large", 100n);
      await contract.storeValue("small", 50n);

      await contract.compareValues("large", "small");

      console.log("\n=== COMPARE VALUES ===");
      console.log("Comparing: 100 > 50");
      console.log("Result is an encrypted boolean (ebool)");
    });
  });

  // ===========================================================================
  //                    DECRYPTION PATTERNS
  // ===========================================================================

  describe("Decryption Patterns", function () {
    it("should request decryption (Step 1 of 3-step pattern)", async function () {
      const { contract } = await deployFixture();

      // Store a value
      await contract.storeValue("toDecrypt", 123n);

      console.log("\n=== ASYNC DECRYPTION ===");
      console.log("Stored encrypted value: 123");

      // Request decryption (Step 1)
      await contract.requestDecryption("toDecrypt");
      console.log("Decryption requested...");

      // Get handle for off-chain decryption (Step 2 helper)
      const handle = await contract.getHandleForDecryption("toDecrypt");
      expect(handle).to.not.equal("0x" + "0".repeat(64));

      console.log("Handle for SDK:", handle.slice(0, 30) + "...");
      console.log("Next: SDK calls publicDecrypt()");
      console.log("Then: Client calls finalizeDecryption() with proof");
    });
  });

  // ===========================================================================
  //                    CONDITIONAL LOGIC
  // ===========================================================================

  describe("Conditional Logic", function () {
    it("should handle encrypted conditionals", async function () {
      const { contract } = await deployFixture();

      // Store values
      await contract.storeValue("big", 100n);
      await contract.storeValue("small", 25n);

      // Select: if (big > small) then big else small
      await contract.conditionalSelect(
        "unused",  // condition created internally
        "big",
        "small",
        "selected"
      );

      const exists = await contract.hasValue("selected");

      console.log("\n=== ENCRYPTED CONDITIONAL ===");
      console.log("big = 100, small = 25");
      console.log("selected = (big > small) ? big : small");
      console.log("The result is encrypted");

      expect(exists).to.be.true;
    });
  });

  // ===========================================================================
  //                    RANDOM NUMBERS
  // ===========================================================================

  describe("Random Numbers", function () {
    it("should generate random values", async function () {
      const { contract } = await deployFixture();

      await contract.generateRandom("rand1");
      await contract.generateRandom("rand2");

      const handle1 = await contract.getRawHandle("rand1");
      const handle2 = await contract.getRawHandle("rand2");

      console.log("\n=== RANDOM NUMBERS ===");
      console.log("Random 1 handle:", handle1.slice(0, 25) + "...");
      console.log("Random 2 handle:", handle2.slice(0, 25) + "...");
      console.log("Handles are different:", handle1 !== handle2);

      // Handles should be different (different random values)
      expect(handle1).to.not.equal(handle2);
    });

    it("should test random logic, not specific values", async function () {
      const { contract } = await deployFixture();

      await contract.generateRandom("myRandom");

      // GOOD: Test that random was generated
      const exists = await contract.hasValue("myRandom");
      expect(exists).to.be.true;

      // GOOD: Test that handle is non-zero
      const handle = await contract.getRawHandle("myRandom");
      expect(handle).to.not.equal("0x" + "0".repeat(64));

      console.log("\n=== TESTING RANDOM CORRECTLY ===");
      console.log("DO: Test that random value exists");
      console.log("DO: Test logic using random values");
      console.log("DON'T: Test for specific random values");
    });
  });

  // ===========================================================================
  //                    GAS CONSIDERATIONS
  // ===========================================================================

  describe("Gas Considerations", function () {
    it("should demonstrate gas usage (mock vs production)", async function () {
      const { contract } = await deployFixture();

      const tx = await contract.multipleOperations(10n, 20n, 3n);
      const receipt = await tx.wait();

      console.log("\n=== GAS USAGE ===");
      console.log("Operations performed:");
      console.log("  1. Three FHE.asEuint64() calls");
      console.log("  2. FHE.add()");
      console.log("  3. FHE.mul()");
      console.log("  4. FHE.gt()");
      console.log("  5. FHE.select()");
      console.log("");
      console.log("Gas used (MOCK):", receipt?.gasUsed.toString());
      console.log("WARNING: Mock gas is NOT representative!");
    });
  });

  // ===========================================================================
  //                    TESTING BEST PRACTICES
  // ===========================================================================

  describe("Testing Best Practices", function () {
    it("should use events for verification (works in both modes)", async function () {
      const { contract } = await deployFixture();

      // Listen for events
      const tx = await contract.storeValue("eventTest", 42n);
      const receipt = await tx.wait();

      // Find the ComputationPerformed event
      const events = receipt?.logs || [];

      console.log("\n=== EVENT-BASED VERIFICATION ===");
      console.log("Events emitted:", events.length);
      console.log("Events work identically in mock and production modes.");

      expect(events.length).to.be.greaterThan(0);
    });

    it("should display testing best practices", async function () {
      console.log("\n");
      console.log("╔══════════════════════════════════════════════════════════════╗");
      console.log("║              SYMBOLIC EXECUTION BEST PRACTICES               ║");
      console.log("╠══════════════════════════════════════════════════════════════╣");
      console.log("║  ALWAYS DO:                                                  ║");
      console.log("║    - Design for async decryption (use 3-step pattern)        ║");
      console.log("║    - Use events for state verification                       ║");
      console.log("║    - Test edge cases thoroughly                              ║");
      console.log("║    - Test on testnet for real gas costs                      ║");
      console.log("║                                                              ║");
      console.log("║  NEVER DO:                                                   ║");
      console.log("║    - Rely on mock-only value peeking in production code      ║");
      console.log("║    - Expect instant decryption in production                 ║");
      console.log("║    - Test for specific random values                         ║");
      console.log("║    - Trust mock gas estimates for production                 ║");
      console.log("╚══════════════════════════════════════════════════════════════╝");
      console.log("\n");
    });
  });
});
