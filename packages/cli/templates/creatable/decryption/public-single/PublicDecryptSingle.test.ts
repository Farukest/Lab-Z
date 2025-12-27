/**
 * Public Decrypt Single Value Test Suite
 *
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║            3-STEP ASYNC PUBLIC DECRYPTION PATTERN                  ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * This is the CURRENT decryption pattern in FHEVM.
 * The old Gateway/Oracle callback pattern has been REMOVED.
 *
 * WHEN TO USE PUBLIC DECRYPTION:
 * - Lottery: Reveal winning number to everyone
 * - Auction: Reveal winning bid publicly
 * - Voting: Reveal final vote counts
 * - Games: Reveal game outcomes
 *
 * WHEN TO USE PRIVATE (USER) DECRYPTION:
 * - Balances: Only owner sees their balance
 * - Scores: Only player sees their score
 * - Private data: Only authorized parties see
 */

import { PublicDecryptSingle, PublicDecryptSingle__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PublicDecryptSingle")) as PublicDecryptSingle__factory;
  const contract = (await factory.deploy()) as PublicDecryptSingle;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("PublicDecryptSingle", function () {
  let signers: Signers;
  let contract: PublicDecryptSingle;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Step 0: Store Encrypted Value", function () {
    it("should store an encrypted value", async function () {
      const secretValue = 42n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretValue)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setValue(encryptedInput.handles[0])
      ).wait();

      const [valueSet, revealRequested, revealed] = await contract.getState();
      expect(valueSet).to.eq(true);
      expect(revealRequested).to.eq(false);
      expect(revealed).to.eq(false);

      console.log("Value stored (encrypted). Ready for reveal request.");
    });
  });

  describe("Step 1: Request Public Reveal", function () {
    it("should request reveal after storing value", async function () {
      const secretValue = 100n;

      // Store value first
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretValue)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setValue(encryptedInput.handles[0])
      ).wait();

      // Request reveal
      await (await contract.connect(signers.alice).requestReveal()).wait();

      const [, revealRequested, revealed] = await contract.getState();
      expect(revealRequested).to.eq(true);
      expect(revealed).to.eq(false);

      console.log("Reveal requested. FHE.makePubliclyDecryptable() called.");
      console.log("Off-chain services can now decrypt the value.");
    });

    it("should reject reveal request without stored value", async function () {
      await expect(contract.connect(signers.alice).requestReveal())
        .to.be.revertedWithCustomError(contract, "ValueNotSet");
    });

    it("should reject duplicate reveal request", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(50n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setValue(encryptedInput.handles[0])
      ).wait();

      await (await contract.connect(signers.alice).requestReveal()).wait();

      // Second request should fail
      await expect(contract.connect(signers.alice).requestReveal())
        .to.be.revertedWithCustomError(contract, "AlreadyRevealed");
    });
  });

  describe("Step 2: Off-chain Decryption (Documentation)", function () {
    it("documents the off-chain decryption process", async function () {
      console.log("\n=== STEP 2: Off-chain Decryption ===\n");
      console.log("After requestReveal() is called, the off-chain flow is:\n");

      console.log("1. Get the encrypted handle from contract:");
      console.log("   const handle = await contract.getValueHandle();\n");

      console.log("2. Decrypt using relayer-sdk:");
      console.log("   const result = await fhevmInstance.publicDecrypt([handle]);\n");

      console.log("3. Extract decrypted value and proof:");
      console.log("   const clearValue = result.clearValues[handle];");
      console.log("   const proof = result.decryptionProof;\n");

      console.log("4. Call finalizeReveal with value and proof:");
      console.log("   await contract.finalizeReveal(clearValue, proof);\n");

      console.log("After finalize, the value is PUBLIC and on-chain!");
    });
  });

  describe("Step 3: Finalize with Proof", function () {
    it("should reject finalize without reveal request", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(123n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setValue(encryptedInput.handles[0])
      ).wait();

      // Try to finalize without requesting reveal
      const fakeProof = "0x";
      await expect(contract.finalizeReveal(123, fakeProof))
        .to.be.revertedWithCustomError(contract, "RevealNotRequested");
    });

    // Note: Full finalize test requires actual KMS integration
    // In production, the proof comes from Zama's decryption service
  });

  describe("Complete Flow Documentation", function () {
    it("documents the complete 3-step flow", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║         COMPLETE 3-STEP PUBLIC DECRYPTION FLOW                     ║");
      console.log("╠═══════════════════════════════════════════════════════════════════╣");
      console.log("║                                                                    ║");
      console.log("║  // STEP 0: Store encrypted value                                  ║");
      console.log("║  const input = await fhevm.createEncryptedInput(addr, user)        ║");
      console.log("║    .add64(secretValue)                                             ║");
      console.log("║    .encrypt();                                                     ║");
      console.log("║  await contract.setValue(input.handles[0]);                        ║");
      console.log("║                                                                    ║");
      console.log("║  // STEP 1: Request public reveal (on-chain)                       ║");
      console.log("║  await contract.requestReveal();                                   ║");
      console.log("║  // Internally calls: FHE.makePubliclyDecryptable(value)           ║");
      console.log("║                                                                    ║");
      console.log("║  // STEP 2: Decrypt off-chain via relayer-sdk                      ║");
      console.log("║  const handle = await contract.getValueHandle();                   ║");
      console.log("║  const result = await fhevmInstance.publicDecrypt([handle]);       ║");
      console.log("║  const clearValue = result.clearValues[handle];                    ║");
      console.log("║  const proof = result.decryptionProof;                             ║");
      console.log("║                                                                    ║");
      console.log("║  // STEP 3: Finalize with proof (on-chain)                         ║");
      console.log("║  await contract.finalizeReveal(clearValue, proof);                 ║");
      console.log("║  // Internally calls: FHE.checkSignatures(cts, cleartexts, proof)  ║");
      console.log("║                                                                    ║");
      console.log("║  // VALUE IS NOW PUBLIC!                                           ║");
      console.log("║  const publicValue = await contract.revealedValue();               ║");
      console.log("║                                                                    ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("\n");
    });
  });

  describe("Comparison: Public vs Private Decryption", function () {
    it("explains when to use each type", async function () {
      console.log("\n=== PUBLIC vs PRIVATE DECRYPTION ===\n");

      console.log("PUBLIC DECRYPTION (this example):");
      console.log("─────────────────────────────────");
      console.log("- Value becomes visible to EVERYONE");
      console.log("- Stored on-chain after finalize");
      console.log("- Uses FHE.makePubliclyDecryptable()");
      console.log("- Requires proof verification");
      console.log("");
      console.log("Use for:");
      console.log("  - Lottery winning numbers");
      console.log("  - Auction final bids");
      console.log("  - Voting results");
      console.log("  - Game outcomes");
      console.log("");

      console.log("PRIVATE (USER) DECRYPTION:");
      console.log("─────────────────────────────────");
      console.log("- Value visible only to authorized user");
      console.log("- Never stored in plaintext on-chain");
      console.log("- Uses FHE.allow(value, userAddress)");
      console.log("- User decrypts off-chain with signature");
      console.log("");
      console.log("Use for:");
      console.log("  - Private balances");
      console.log("  - Personal scores");
      console.log("  - Confidential data");
      console.log("  - Medical records");
    });
  });

  describe("Error Handling", function () {
    it("demonstrates proper error handling", async function () {
      console.log("\n=== Error Handling ===\n");
      console.log("Common errors to handle:");
      console.log("");
      console.log("1. ValueNotSet - Call setValue() before requestReveal()");
      console.log("2. RevealNotRequested - Call requestReveal() before finalizeReveal()");
      console.log("3. AlreadyRevealed - Can only reveal once");
      console.log("4. InvalidDecryptionProof - Proof verification failed");
      console.log("");
      console.log("Always check the state before calling functions:");
      console.log("  const [valueSet, requested, revealed] = await contract.getState();");
    });
  });
});
