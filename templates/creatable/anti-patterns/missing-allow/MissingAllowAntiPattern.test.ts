/**
 * Missing Allow Anti-Pattern - Test Suite
 *
 * THE MISTAKE:
 * Forgetting to call FHE.allowThis() and FHE.allow() after creating
 * or computing encrypted values.
 *
 * CONSEQUENCES:
 * - Contract can't use values in future operations
 * - Users can't decrypt their own values
 * - Silent failures or unexpected behavior
 */

import { MissingAllowAntiPattern, MissingAllowAntiPattern__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("MissingAllowAntiPattern")) as MissingAllowAntiPattern__factory;
  const contract = (await factory.deploy()) as MissingAllowAntiPattern;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("MissingAllowAntiPattern", function () {
  let signers: { deployer: HardhatEthersSigner; alice: HardhatEthersSigner };
  let contract: MissingAllowAntiPattern;
  let contractAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Understanding the Permission System", function () {
    it("explains FHE.allowThis() and FHE.allow()", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║                    FHE PERMISSION SYSTEM                           ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("FHE.allowThis(encryptedValue):");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("• Grants THIS CONTRACT permission to use the value");
      console.log("• Required for: storing, computing, comparing later");
      console.log("• Without it: future FHE operations on this value fail");
      console.log("");

      console.log("FHE.allow(encryptedValue, userAddress):");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("• Grants SPECIFIC USER permission to decrypt");
      console.log("• Required for: off-chain userDecryptEuint()");
      console.log("• Without it: user gets wrong value or decryption fails");
      console.log("");
    });
  });

  describe("Anti-Pattern 1: Missing allowThis", function () {
    it("shows what happens without FHE.allowThis()", async function () {
      console.log("\n=== ANTI-PATTERN: Missing FHE.allowThis() ===\n");

      const value = 100n;

      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      // Store without allowThis
      await (await contract
        .connect(signers.alice)
        .setBadValueNoAllowThis(input.handles[0])
      ).wait();

      console.log("Value stored WITHOUT FHE.allowThis()");
      console.log("Future operations on this value may fail!");
      console.log("");
      console.log("When contract tries to use this value later,");
      console.log("FHE operations will fail because contract");
      console.log("doesn't have permission to access the value.");
    });
  });

  describe("Anti-Pattern 2: Missing user allow", function () {
    it("shows what happens when user can't decrypt", async function () {
      console.log("\n=== ANTI-PATTERN: Missing FHE.allow(value, user) ===\n");

      const value = 200n;

      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      // Store without user allow
      await (await contract
        .connect(signers.alice)
        .setBadValueNoUserAllow(input.handles[0])
      ).wait();

      console.log("Value stored with allowThis but WITHOUT FHE.allow(value, alice)");
      console.log("");
      console.log("Contract can use the value for computations...");
      console.log("But Alice CANNOT decrypt her own value!");
      console.log("");
      console.log("Decryption would fail or return wrong result.");
    });
  });

  describe("Correct Pattern", function () {
    it("shows the correct way with all permissions", async function () {
      console.log("\n=== CORRECT: All Permissions Set ===\n");

      const value = 300n;

      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      // Store correctly
      await (await contract
        .connect(signers.alice)
        .setGoodValue(input.handles[0], input.inputProof)
      ).wait();

      console.log("Value stored with BOTH permissions:");
      console.log("  FHE.allowThis(value) ← Contract can use");
      console.log("  FHE.allow(value, msg.sender) ← User can decrypt");
      console.log("");

      // User can decrypt
      const encrypted = await contract.getValueWithAllow();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encrypted,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(value);
      console.log(`Alice successfully decrypted: ${decrypted}`);
    });
  });

  describe("Anti-Pattern 3: Computed Values Need New Permissions", function () {
    it("shows that FHE operations create NEW values", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║        CRITICAL: Computed Values Need NEW Permissions!             ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("When you do: euint64 sum = FHE.add(a, b);");
      console.log("");
      console.log("'sum' is a BRAND NEW encrypted value!");
      console.log("It does NOT inherit permissions from 'a' or 'b'!");
      console.log("");
      console.log("You MUST call:");
      console.log("  FHE.allowThis(sum);");
      console.log("  FHE.allow(sum, msg.sender);");
      console.log("");
    });

    it("demonstrates correct handling of computed values", async function () {
      const a = 50n;
      const b = 30n;

      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(a)
        .add64(b)
        .encrypt();

      // Use the CORRECT function that sets permissions on result
      await (await contract
        .connect(signers.alice)
        .goodCompute(input.handles[0], input.handles[1], input.inputProof)
      ).wait();

      // User can decrypt the computed result
      const encrypted = await contract.getComputedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encrypted,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(a + b);
      console.log(`Correctly handled computed value: ${a} + ${b} = ${decrypted}`);
    });
  });

  describe("Permission Checklist", function () {
    it("provides a checklist for developers", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║                    PERMISSION CHECKLIST                            ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("For EVERY encrypted value (euint*, ebool), ask yourself:");
      console.log("");
      console.log("□ Did I call FHE.allowThis(value)?");
      console.log("  └─ If contract will use this value later → YES");
      console.log("");
      console.log("□ Did I call FHE.allow(value, userAddress)?");
      console.log("  └─ If any user needs to decrypt → YES for each user");
      console.log("");
      console.log("□ Is this value computed from other values?");
      console.log("  └─ If yes → It's a NEW value, needs NEW permissions!");
      console.log("");

      console.log("TEMPLATE:");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("function myFunction(externalEuint64 input) external {");
      console.log("    euint64 value = FHE.fromExternal(input);");
      console.log("    ");
      console.log("    // Always set permissions after creating/computing");
      console.log("    FHE.allowThis(value);");
      console.log("    FHE.allow(value, msg.sender);");
      console.log("    ");
      console.log("    _storedValue = value;");
      console.log("}");
      console.log("");
    });
  });

  describe("Summary", function () {
    it("summarizes the anti-pattern", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║                         SUMMARY                                    ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("COMMON MISTAKES:");
      console.log("1. Forgetting FHE.allowThis() → Contract can't use value");
      console.log("2. Forgetting FHE.allow(value, user) → User can't decrypt");
      console.log("3. Not setting permissions on computed values");
      console.log("");

      console.log("REMEMBER:");
      console.log("• Every encrypted value needs explicit permissions");
      console.log("• FHE operations create NEW values (add, mul, etc.)");
      console.log("• Permissions don't transfer automatically");
      console.log("• Check your permissions on EVERY path through the code");
      console.log("");
    });
  });
});
