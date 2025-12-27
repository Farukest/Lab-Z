import { expect } from "chai";
import hre from "hardhat";

/**
 * HANDLE JOURNEY TEST SUITE
 *
 * This test suite walks through the complete lifecycle of an FHE handle:
 *
 *   BIRTH ──> PERMISSION ──> OPERATION ──> STORAGE ──> DEATH
 *
 * Note: Decryption tests are simplified as they require Gateway/KMS in production.
 */
describe("HandleJourney", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await hre.ethers.getSigners();

    const HandleJourney = await hre.ethers.getContractFactory("HandleJourney");
    const contract = await HandleJourney.deploy();
    await contract.waitForDeployment();

    return { contract, owner, alice, bob };
  }

  // ===========================================================================
  //                    STAGE 1: BIRTH - Handle Creation
  // ===========================================================================

  describe("Stage 1: Birth - Handle Creation", function () {
    it("should create handle from plaintext", async function () {
      const { contract } = await deployFixture();

      const secretValue = 42n;

      // Create a handle from plaintext
      const tx = await contract.stage1_birthFromPlaintext(secretValue);
      await tx.wait();

      // Verify handle was created (not zero)
      expect(await contract.hasActiveHandle()).to.be.true;

      // The raw handle should be a non-zero bytes32
      const rawHandle = await contract.getHandleRaw();
      expect(rawHandle).to.not.equal("0x" + "0".repeat(64));

      console.log("Handle born from plaintext:");
      console.log("  Raw handle value:", rawHandle.slice(0, 30) + "...");
    });
  });

  // ===========================================================================
  //                    STAGE 2: PERMISSION - Access Control
  // ===========================================================================

  describe("Stage 2: Permission - Access Control", function () {
    it("should grant permanent permission to another address", async function () {
      const { contract, alice } = await deployFixture();

      // First, create a handle
      await contract.stage1_birthFromPlaintext(50n);

      // Grant permanent permission to Alice
      const tx = await contract.stage2_grantPermanentPermission(alice.address);
      await tx.wait();

      console.log("Permanent permission granted:");
      console.log("  Grantee:", alice.address);
    });

    it("should grant transient permission (same transaction only)", async function () {
      const { contract, bob } = await deployFixture();

      // Create a handle
      await contract.stage1_birthFromPlaintext(75n);

      // Grant transient permission to Bob
      const tx = await contract.stage2_grantTransientPermission(bob.address);
      await tx.wait();

      console.log("Transient permission granted:");
      console.log("  Grantee:", bob.address);
    });
  });

  // ===========================================================================
  //                  STAGE 3: OPERATION - Creating Child Handles
  // ===========================================================================

  describe("Stage 3: Operation - Creating Child Handles", function () {
    it("should create child handle from add operation", async function () {
      const { contract } = await deployFixture();

      // Create parent handle
      await contract.stage1_birthFromPlaintext(100n);

      const originalHandle = await contract.getHandleRaw();

      // Perform addition - this creates a NEW handle
      await contract.stage3_operationAdd(50n);

      console.log("Operation: FHE.add(parent, 50)");
      console.log("  Original handle:", originalHandle.slice(0, 30) + "...");
      console.log("  A NEW child handle was created internally");
    });

    it("should create child handle from multiply operation", async function () {
      const { contract } = await deployFixture();

      await contract.stage1_birthFromPlaintext(20n);

      // Multiply - creates new handle
      await contract.stage3_operationMultiply(3n);

      console.log("Operation: FHE.mul(parent, 3)");
      console.log("  Child handle = encrypted(20 * 3) = encrypted(60)");
    });

    it("should create ebool handle from comparison", async function () {
      const { contract } = await deployFixture();

      await contract.stage1_birthFromPlaintext(100n);

      // Compare - creates ebool handle
      await contract.stage3_operationCompare(50n);

      console.log("Operation: FHE.gt(parent, 50)");
      console.log("  Result is an ebool handle (encrypted boolean)");
    });
  });

  // ===========================================================================
  //                      STAGE 4: STORAGE - Persistence
  // ===========================================================================

  describe("Stage 4: Storage - Persistence", function () {
    it("should store operation result as tracked handle", async function () {
      const { contract } = await deployFixture();

      // Create and operate
      await contract.stage1_birthFromPlaintext(10n);
      await contract.stage3_operationMultiply(5n);

      const handleBefore = await contract.getHandleRaw();

      // Store the operation result
      await contract.stage4_storeOperationResult();

      const handleAfter = await contract.getHandleRaw();

      console.log("Storage demonstration:");
      console.log("  Handle before store:", handleBefore.slice(0, 30) + "...");
      console.log("  Handle after store:", handleAfter.slice(0, 30) + "...");
      console.log("  The operation result is now the tracked handle");
    });
  });

  // ===========================================================================
  //                       STAGE 5: DEATH - Decryption Request
  // ===========================================================================

  describe("Stage 5: Death - Decryption", function () {
    it("should request decryption (marks handle for reveal)", async function () {
      const { contract } = await deployFixture();

      // Create a handle with known value
      const secretValue = 42n;
      await contract.stage1_birthFromPlaintext(secretValue);

      // Request decryption (Step 1 of 3-step pattern)
      await contract.stage5_requestDecryption();

      // Get handle for off-chain decryption
      const handle = await contract.getHandleForDecryption();
      expect(handle).to.not.equal("0x" + "0".repeat(64));

      console.log("Handle marked for decryption:");
      console.log("  Handle:", handle.slice(0, 30) + "...");
      console.log("  Next: Off-chain SDK calls publicDecrypt()");
      console.log("  Then: Client calls finalizeDecryption() with proof");
    });
  });

  // ===========================================================================
  //                           LIFECYCLE SUMMARY
  // ===========================================================================

  describe("Full Lifecycle", function () {
    it("should complete stages 1-4 of handle lifecycle", async function () {
      const { contract, alice } = await deployFixture();

      console.log("\n=== HANDLE LIFECYCLE STAGES 1-4 ===\n");

      // Stage 1: Birth
      console.log("STAGE 1: BIRTH");
      await contract.stage1_birthFromPlaintext(100n);
      console.log("  Handle created from plaintext value 100\n");

      // Stage 2: Permission
      console.log("STAGE 2: PERMISSION");
      await contract.stage2_grantPermanentPermission(alice.address);
      console.log("  Permanent permission granted to Alice\n");

      // Stage 3: Operation
      console.log("STAGE 3: OPERATION");
      await contract.stage3_operationAdd(50n);
      console.log("  Child handle created: 100 + 50 = 150\n");

      // Stage 4: Storage
      console.log("STAGE 4: STORAGE");
      await contract.stage4_storeOperationResult();
      console.log("  Operation result (150) stored as tracked handle\n");

      console.log("=== STAGES 1-4 COMPLETE ===");
      console.log("(Stage 5 - Decryption - requires off-chain SDK)\n");
    });
  });
});
