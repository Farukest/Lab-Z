import { expect } from "chai";
import hre from "hardhat";

/**
 * HANDLE OBSERVATORY TEST SUITE
 *
 * This advanced test suite demonstrates the Handle Observatory - a comprehensive
 * system for tracking, debugging, and auditing FHE handles.
 *
 * Note: Decryption tests are simplified as they require Gateway/KMS in production.
 */
describe("HandleObservatory", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await hre.ethers.getSigners();

    const HandleObservatory = await hre.ethers.getContractFactory("HandleObservatory");
    const contract = await HandleObservatory.deploy();
    await contract.waitForDeployment();

    return { contract, owner, alice, bob };
  }

  // ===========================================================================
  //                         HANDLE REGISTRATION
  // ===========================================================================

  describe("Handle Registration", function () {
    it("should register handle from plaintext with metadata", async function () {
      const { contract, owner } = await deployFixture();

      // Create and register a handle
      const tx = await contract.createFromPlaintext(100n, "mySecret");
      await tx.wait();

      // Query the handle info
      const info = await contract.getHandleInfo("mySecret");

      console.log("\n=== HANDLE REGISTRATION ===");
      console.log("Name:", info.name);
      console.log("Origin:", ["PLAINTEXT", "USER_INPUT", "OPERATION", "RANDOM"][Number(info.origin)]);
      console.log("Creator:", info.creator);
      console.log("State:", ["ACTIVE", "DECRYPTING", "DECRYPTED", "ARCHIVED"][Number(info.state)]);

      expect(info.name).to.equal("mySecret");
      expect(info.origin).to.equal(0n); // PLAINTEXT
      expect(info.creator).to.equal(owner.address);
      expect(info.state).to.equal(0n); // ACTIVE
    });

    it("should register multiple handles with tracking", async function () {
      const { contract } = await deployFixture();

      // Create multiple handles
      await contract.createFromPlaintext(10n, "valueA");
      await contract.createFromPlaintext(20n, "valueB");
      await contract.createFromPlaintext(30n, "valueC");

      const count = await contract.handleCount();

      console.log("\n=== MULTIPLE HANDLES ===");
      console.log("Total registered handles:", count.toString());

      expect(count).to.equal(3n);
    });

    it("should register random handle", async function () {
      const { contract } = await deployFixture();

      await contract.createRandom("randomSecret");

      const info = await contract.getHandleInfo("randomSecret");

      console.log("\n=== RANDOM HANDLE ===");
      console.log("Name:", info.name);
      console.log("Origin:", ["PLAINTEXT", "USER_INPUT", "OPERATION", "RANDOM"][Number(info.origin)]);

      expect(info.origin).to.equal(3n); // RANDOM
    });
  });

  // ===========================================================================
  //                         HANDLE GENEALOGY
  // ===========================================================================

  describe("Handle Genealogy", function () {
    it("should track parent-child relationships", async function () {
      const { contract } = await deployFixture();

      // Create parent handles
      await contract.createFromPlaintext(100n, "parent1");
      await contract.createFromPlaintext(50n, "parent2");

      // Create child through operation
      await contract.operationAdd("parent1", "parent2", "child");

      // Query child info
      const childInfo = await contract.getHandleInfo("child");

      console.log("\n=== HANDLE GENEALOGY ===");
      console.log("Child handle:", childInfo.name);
      console.log("Operation:", childInfo.operationType);
      console.log("Parent handles count:", childInfo.parentHandles.length);

      expect(childInfo.origin).to.equal(2n); // OPERATION
      expect(childInfo.operationType).to.equal("add");
      expect(childInfo.parentHandles.length).to.equal(2);
    });

    it("should track multiply operations", async function () {
      const { contract } = await deployFixture();

      await contract.createFromPlaintext(10n, "baseValue");
      await contract.createFromPlaintext(5n, "multiplier");
      await contract.operationMul("baseValue", "multiplier", "product");

      const productInfo = await contract.getHandleInfo("product");

      console.log("\n=== MULTIPLY OPERATION ===");
      console.log("Product handle:", productInfo.name);
      console.log("Operation:", productInfo.operationType);

      expect(productInfo.operationType).to.equal("mul");
    });
  });

  // ===========================================================================
  //                         PERMISSION AUDIT
  // ===========================================================================

  describe("Permission Audit", function () {
    it("should maintain permission audit trail", async function () {
      const { contract, alice, bob } = await deployFixture();

      // Create a handle
      await contract.createFromPlaintext(999n, "secret");

      // Grant additional permissions
      await contract.grantPermission("secret", alice.address);
      await contract.grantPermission("secret", bob.address);

      const rawHandle = await contract.getRawHandle("secret");
      const permissions = await contract.getPermissionsForHandle(rawHandle);

      console.log("\n=== PERMISSION AUDIT TRAIL ===");
      console.log("Handle: secret");
      console.log("Total permissions:", permissions.length);

      // Should have: allowThis, allow(creator), allow(alice), allow(bob)
      expect(permissions.length).to.equal(4);
    });

    it("should distinguish permission types", async function () {
      const { contract, alice } = await deployFixture();

      await contract.createFromPlaintext(123n, "tracked");

      // Grant different permission types
      await contract.grantPermission("tracked", alice.address);
      await contract.grantTransientPermission("tracked", alice.address);

      const rawHandle = await contract.getRawHandle("tracked");
      const permissions = await contract.getPermissionsForHandle(rawHandle);

      const types = permissions.map((p: any) => p.permissionType);

      console.log("\n=== PERMISSION TYPES ===");
      console.log("Permission types recorded:", [...new Set(types)].join(", "));

      expect(types).to.include("allowThis");
      expect(types).to.include("allow");
      expect(types).to.include("allowTransient");
    });
  });

  // ===========================================================================
  //                         LIFECYCLE TRACKING
  // ===========================================================================

  describe("Lifecycle Tracking", function () {
    it("should track handle states through lifecycle", async function () {
      const { contract } = await deployFixture();

      // Create handle - starts ACTIVE
      await contract.createFromPlaintext(42n, "lifecycle");

      let info = await contract.getHandleInfo("lifecycle");
      const stateNames = ["ACTIVE", "DECRYPTING", "DECRYPTED", "ARCHIVED"];

      console.log("\n=== LIFECYCLE TRACKING ===");
      console.log("Initial state:", stateNames[Number(info.state)]);

      expect(info.state).to.equal(0n); // ACTIVE

      // Request decryption - changes to DECRYPTING
      await contract.requestDecryption("lifecycle");

      info = await contract.getHandleInfo("lifecycle");
      console.log("After decryption request:", stateNames[Number(info.state)]);

      expect(info.state).to.equal(1n); // DECRYPTING
    });
  });

  // ===========================================================================
  //                         DEBUGGING SCENARIOS
  // ===========================================================================

  describe("Debugging Scenarios", function () {
    it("should trace complex computation genealogy", async function () {
      const { contract } = await deployFixture();

      // Create inputs
      await contract.createFromPlaintext(5n, "a");   // 5
      await contract.createFromPlaintext(3n, "b");   // 3
      await contract.createFromPlaintext(4n, "c");   // 4

      // Compute (a + b)
      await contract.operationAdd("a", "b", "sum");  // 5 + 3 = 8

      // Compute sum * c
      await contract.operationMul("sum", "c", "result"); // 8 * 4 = 32

      console.log("\n=== COMPUTATION TRACE ===");
      console.log("Computing: (a + b) * c");

      const result = await contract.getHandleInfo("result");
      console.log("Result handle:", result.name);
      console.log("  Operation:", result.operationType);
      console.log("  Parents count:", result.parentHandles.length);

      expect(result.operationType).to.equal("mul");
    });

    it("should generate dependency report for debugging", async function () {
      const { contract } = await deployFixture();

      // Create a computation graph
      await contract.createFromPlaintext(10n, "x");
      await contract.createFromPlaintext(2n, "y");
      await contract.operationMul("x", "y", "xy");     // 20
      await contract.operationAdd("x", "xy", "result"); // 30

      const count = await contract.handleCount();
      const permCount = await contract.getPermissionCount();

      console.log("\n=== DEPENDENCY REPORT ===");
      console.log("Total handles:", count.toString());
      console.log("Total permissions:", permCount.toString());

      expect(count).to.equal(4n);
    });
  });

  // ===========================================================================
  //                              SUMMARY
  // ===========================================================================

  describe("Summary", function () {
    it("should display observatory capabilities", async function () {
      console.log("\n");
      console.log("╔══════════════════════════════════════════════════════════════╗");
      console.log("║                  HANDLE OBSERVATORY                          ║");
      console.log("╠══════════════════════════════════════════════════════════════╣");
      console.log("║  REGISTRY  - Register handles with metadata                  ║");
      console.log("║  GENEALOGY - Track parent-child relationships               ║");
      console.log("║  PERMISSIONS - Complete audit trail                          ║");
      console.log("║  LIFECYCLE - State tracking: ACTIVE -> DECRYPTING            ║");
      console.log("╚══════════════════════════════════════════════════════════════╝");
      console.log("\n");
    });
  });
});
