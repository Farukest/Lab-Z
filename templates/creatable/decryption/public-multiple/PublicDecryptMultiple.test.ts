/**
 * Public Decrypt Multiple Values Test Suite
 *
 * BATCH PUBLIC DECRYPTION: Reveal multiple encrypted values at once
 *
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║         BATCH 3-STEP ASYNC PUBLIC DECRYPTION PATTERN              ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * This extends the single-value pattern to handle multiple values:
 * - One request marks ALL values for decryption
 * - One off-chain call decrypts ALL values
 * - One proof verifies ALL values
 *
 * Use Cases:
 * - Lottery: Reveal all winning numbers together
 * - Auction: Reveal all bids at once
 * - Election: Reveal all vote counts
 * - Tournament: Reveal all final scores
 */

import { PublicDecryptMultiple, PublicDecryptMultiple__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PublicDecryptMultiple")) as PublicDecryptMultiple__factory;
  const contract = (await factory.deploy()) as PublicDecryptMultiple;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("PublicDecryptMultiple", function () {
  let signers: Signers;
  let contract: PublicDecryptMultiple;
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

  describe("Step 0: Store Multiple Encrypted Values", function () {
    it("should store 3 encrypted values", async function () {
      const value1 = 100n;
      const value2 = 200n;
      const value3 = 300n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value1)
        .add64(value2)
        .add64(value3)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setValues(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.inputProof
        )
      ).wait();

      const [valuesSet, revealRequested, revealed] = await contract.getState();
      expect(valuesSet).to.eq(true);
      expect(revealRequested).to.eq(false);
      expect(revealed).to.eq(false);

      console.log("3 encrypted values stored. Ready for batch reveal.");
    });
  });

  describe("Step 1: Request Batch Reveal", function () {
    it("should request reveal for all values at once", async function () {
      // Store values first
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(111n)
        .add64(222n)
        .add64(333n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setValues(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.inputProof
        )
      ).wait();

      // Request batch reveal
      await (await contract.connect(signers.alice).requestRevealAll()).wait();

      const [, revealRequested, revealed] = await contract.getState();
      expect(revealRequested).to.eq(true);
      expect(revealed).to.eq(false);

      console.log("Batch reveal requested for 3 values.");
      console.log("FHE.makePubliclyDecryptable() called for each value.");
    });

    it("should reject reveal without stored values", async function () {
      await expect(contract.connect(signers.alice).requestRevealAll())
        .to.be.revertedWithCustomError(contract, "ValuesNotSet");
    });

    it("should reject duplicate reveal request", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(1n)
        .add64(2n)
        .add64(3n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setValues(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.inputProof
        )
      ).wait();

      await (await contract.connect(signers.alice).requestRevealAll()).wait();

      await expect(contract.connect(signers.alice).requestRevealAll())
        .to.be.revertedWithCustomError(contract, "AlreadyRevealed");
    });
  });

  describe("Step 2: Off-chain Batch Decryption (Documentation)", function () {
    it("documents the off-chain batch decryption process", async function () {
      console.log("\n=== STEP 2: Off-chain Batch Decryption ===\n");

      console.log("After requestRevealAll() is called:\n");

      console.log("1. Get ALL encrypted handles in one call:");
      console.log("   const [h1, h2, h3] = await contract.getAllHandles();\n");

      console.log("2. Batch decrypt using relayer-sdk:");
      console.log("   const result = await fhevmInstance.publicDecrypt([h1, h2, h3]);\n");

      console.log("3. Extract all decrypted values:");
      console.log("   const clear1 = result.clearValues[h1];");
      console.log("   const clear2 = result.clearValues[h2];");
      console.log("   const clear3 = result.clearValues[h3];");
      console.log("   const proof = result.decryptionProof;  // ONE proof for ALL\n");

      console.log("4. Finalize with single proof:");
      console.log("   await contract.finalizeRevealAll(clear1, clear2, clear3, proof);\n");

      console.log("EFFICIENCY: One proof verifies all values!");
    });
  });

  describe("Lottery Example with 4 Values", function () {
    it("should store and request reveal for lottery numbers", async function () {
      const num1 = 7n;
      const num2 = 14n;
      const num3 = 21n;
      const bonus = 42n;

      // Set lottery numbers
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(num1)
        .add32(num2)
        .add32(num3)
        .add32(bonus)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setLotteryNumbers(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.inputProof
        )
      ).wait();

      expect(await contract.lotterySet()).to.eq(true);
      console.log("Lottery numbers set (encrypted)");

      // Request reveal
      await (await contract.connect(signers.alice).requestLotteryReveal()).wait();

      expect(await contract.lotteryRevealRequested()).to.eq(true);
      console.log("Lottery reveal requested for 4 numbers");
    });

    it("should get all lottery handles for batch decryption", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(1n)
        .add32(2n)
        .add32(3n)
        .add32(99n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setLotteryNumbers(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.inputProof
        )
      ).wait();

      const [h1, h2, h3, hBonus] = await contract.getLotteryHandles();

      console.log("Retrieved 4 lottery handles:");
      console.log(`  Number 1: ${h1}`);
      console.log(`  Number 2: ${h2}`);
      console.log(`  Number 3: ${h3}`);
      console.log(`  Bonus: ${hBonus}`);
      console.log("\nThese can be batch decrypted off-chain.");
    });
  });

  describe("Error Handling", function () {
    it("should reject finalize without reveal request", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(1n)
        .add64(2n)
        .add64(3n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setValues(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.inputProof
        )
      ).wait();

      const fakeProof = "0x";
      await expect(contract.finalizeRevealAll(1, 2, 3, fakeProof))
        .to.be.revertedWithCustomError(contract, "RevealNotRequested");
    });
  });

  describe("Complete Flow Documentation", function () {
    it("documents the complete batch public decryption flow", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════════════╗");
      console.log("║           COMPLETE BATCH PUBLIC DECRYPTION FLOW                            ║");
      console.log("╠═══════════════════════════════════════════════════════════════════════════╣");
      console.log("║                                                                            ║");
      console.log("║  // STEP 0: Store multiple encrypted values                                ║");
      console.log("║  const input = await fhevm.createEncryptedInput(addr, user)                ║");
      console.log("║    .add64(value1).add64(value2).add64(value3).encrypt();                   ║");
      console.log("║  await contract.setValues(input.handles[0], [1], [2]);                     ║");
      console.log("║                                                                            ║");
      console.log("║  // STEP 1: Request batch reveal (on-chain)                                ║");
      console.log("║  await contract.requestRevealAll();                                        ║");
      console.log("║  // Internally calls FHE.makePubliclyDecryptable() for EACH value          ║");
      console.log("║                                                                            ║");
      console.log("║  // STEP 2: Batch decrypt off-chain                                        ║");
      console.log("║  const [h1, h2, h3] = await contract.getAllHandles();                      ║");
      console.log("║  const result = await fhevmInstance.publicDecrypt([h1, h2, h3]);           ║");
      console.log("║  const clear1 = result.clearValues[h1];                                    ║");
      console.log("║  const clear2 = result.clearValues[h2];                                    ║");
      console.log("║  const clear3 = result.clearValues[h3];                                    ║");
      console.log("║  const proof = result.decryptionProof;  // ONE proof for all!              ║");
      console.log("║                                                                            ║");
      console.log("║  // STEP 3: Finalize with single proof (on-chain)                          ║");
      console.log("║  await contract.finalizeRevealAll(clear1, clear2, clear3, proof);          ║");
      console.log("║  // One FHE.checkSignatures() call verifies ALL values!                    ║");
      console.log("║                                                                            ║");
      console.log("║  // ALL VALUES ARE NOW PUBLIC!                                             ║");
      console.log("║  const [v1, v2, v3] = await contract.getAllRevealedValues();               ║");
      console.log("║                                                                            ║");
      console.log("╚═══════════════════════════════════════════════════════════════════════════╝");
      console.log("\n");
    });
  });

  describe("Comparison: Single vs Multiple", function () {
    it("explains efficiency of batch decryption", async function () {
      console.log("\n=== SINGLE vs BATCH PUBLIC DECRYPTION ===\n");

      console.log("SINGLE VALUE (3 values = 3 full flows):");
      console.log("─────────────────────────────────────────");
      console.log("  requestReveal1() -> decrypt1 -> finalize1()");
      console.log("  requestReveal2() -> decrypt2 -> finalize2()");
      console.log("  requestReveal3() -> decrypt3 -> finalize3()");
      console.log("  Total: 6 transactions, 3 proofs");
      console.log("");

      console.log("BATCH (3 values = 1 flow):");
      console.log("─────────────────────────────────────────");
      console.log("  requestRevealAll() -> decryptAll -> finalizeAll()");
      console.log("  Total: 2 transactions, 1 proof");
      console.log("");

      console.log("BENEFITS OF BATCH:");
      console.log("  - Fewer transactions (gas savings)");
      console.log("  - Single proof verification");
      console.log("  - Atomic reveal (all or nothing)");
      console.log("  - Simpler off-chain logic");
    });
  });

  describe("Use Case Examples", function () {
    it("describes real-world use cases", async function () {
      console.log("\n=== BATCH REVEAL USE CASES ===\n");

      console.log("LOTTERY:");
      console.log("  - Store 6 winning numbers encrypted");
      console.log("  - Request reveal after ticket sales close");
      console.log("  - Reveal all numbers atomically");
      console.log("");

      console.log("ELECTION:");
      console.log("  - Store vote counts for each candidate");
      console.log("  - Request reveal after voting ends");
      console.log("  - Reveal all counts at once (fair!)");
      console.log("");

      console.log("SEALED AUCTION:");
      console.log("  - Store all encrypted bids");
      console.log("  - Request reveal after bidding closes");
      console.log("  - Reveal all bids simultaneously");
      console.log("");

      console.log("TOURNAMENT:");
      console.log("  - Store encrypted scores for all players");
      console.log("  - Request reveal after tournament ends");
      console.log("  - Reveal final leaderboard at once");
    });
  });
});
