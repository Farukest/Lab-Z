/**
 * User Decrypt Multiple Values Test Suite
 *
 * BATCH PRIVATE DECRYPTION: Decrypt multiple encrypted values at once
 *
 * How it works:
 * 1. Contract stores multiple encrypted values with FHE.allow() for each
 * 2. User retrieves all encrypted handles in one call
 * 3. User decrypts all values off-chain in batch
 *
 * Benefits:
 * - More efficient than single value decryption
 * - All user data retrieved in one transaction
 * - Decryption can be parallelized off-chain
 */

import { UserDecryptMultiple, UserDecryptMultiple__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("UserDecryptMultiple")) as UserDecryptMultiple__factory;
  const contract = (await factory.deploy()) as UserDecryptMultiple;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("UserDecryptMultiple", function () {
  let signers: Signers;
  let contract: UserDecryptMultiple;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      carol: ethSigners[3],
    };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Profile Creation with Multiple Values", function () {
    it("should create profile with 4 encrypted values", async function () {
      const balance = 10000n;
      const score = 500n;
      const level = 10n;
      const isPremium = 1n; // true

      // Encrypt all 4 values in one input
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(balance)
        .add32(score)
        .add32(level)
        .add32(isPremium)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .createProfile(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.inputProof
        )
      ).wait();

      expect(await contract.hasProfile(signers.alice.address)).to.eq(true);
      console.log("Profile created with 4 encrypted values");
    });
  });

  describe("Batch Decryption of Multiple Values", function () {
    it("should decrypt all profile values at once", async function () {
      const balance = 5000n;
      const score = 250n;
      const level = 5n;
      const isPremium = 1n;

      // Create profile
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(balance)
        .add32(score)
        .add32(level)
        .add32(isPremium)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .createProfile(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.inputProof
        )
      ).wait();

      // Get all encrypted handles in one call
      const [encBalance, encScore, encLevel, encIsPremium] =
        await contract.connect(signers.alice).getMyProfile();

      console.log("Retrieved 4 encrypted handles");

      // Decrypt all values (in real scenario, these can be parallelized)
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encBalance,
        contractAddress,
        signers.alice
      );

      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encScore,
        contractAddress,
        signers.alice
      );

      const clearLevel = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encLevel,
        contractAddress,
        signers.alice
      );

      const clearPremium = await fhevm.userDecryptEbool(
        encIsPremium,
        contractAddress,
        signers.alice
      );

      // Verify all values
      expect(clearBalance).to.eq(balance);
      expect(clearScore).to.eq(score);
      expect(clearLevel).to.eq(level);
      expect(clearPremium).to.eq(true);

      console.log("\nDecrypted Profile:");
      console.log(`  Balance: ${clearBalance}`);
      console.log(`  Score: ${clearScore}`);
      console.log(`  Level: ${clearLevel}`);
      console.log(`  Premium: ${clearPremium}`);
    });
  });

  describe("Game Stats with 4 Encrypted Values", function () {
    it("should create and decrypt game stats", async function () {
      const health = 100n;
      const mana = 50n;
      const strength = 25n;
      const defense = 15n;

      // Create game stats
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(health)
        .add32(mana)
        .add32(strength)
        .add32(defense)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .createGameStats(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.inputProof
        )
      ).wait();

      // Get all stats
      const [encHealth, encMana, encStrength, encDefense] =
        await contract.connect(signers.alice).getMyGameStats();

      // Decrypt all
      const clearHealth = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encHealth,
        contractAddress,
        signers.alice
      );

      const clearMana = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encMana,
        contractAddress,
        signers.alice
      );

      const clearStrength = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encStrength,
        contractAddress,
        signers.alice
      );

      const clearDefense = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encDefense,
        contractAddress,
        signers.alice
      );

      expect(clearHealth).to.eq(health);
      expect(clearMana).to.eq(mana);
      expect(clearStrength).to.eq(strength);
      expect(clearDefense).to.eq(defense);

      console.log("\nDecrypted Game Stats:");
      console.log(`  Health: ${clearHealth}`);
      console.log(`  Mana: ${clearMana}`);
      console.log(`  Strength: ${clearStrength}`);
      console.log(`  Defense: ${clearDefense}`);
    });
  });

  describe("Sharing Multiple Values", function () {
    it("should share all profile values with another user", async function () {
      const balance = 7500n;
      const score = 300n;
      const level = 7n;
      const isPremium = 0n; // false

      // Alice creates profile
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(balance)
        .add32(score)
        .add32(level)
        .add32(isPremium)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .createProfile(
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.inputProof
        )
      ).wait();

      // Alice shares with Bob
      await (await contract
        .connect(signers.alice)
        .shareProfileWith(signers.bob.address)
      ).wait();

      console.log("Alice shared her profile with Bob");

      // Bob gets Alice's profile
      const [encBalance, encScore, encLevel, encIsPremium] =
        await contract.connect(signers.bob).getProfileOf(signers.alice.address);

      // Bob decrypts (he has permission now)
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encBalance,
        contractAddress,
        signers.bob
      );

      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encScore,
        contractAddress,
        signers.bob
      );

      expect(clearBalance).to.eq(balance);
      expect(clearScore).to.eq(score);

      console.log(`Bob decrypted Alice's balance: ${clearBalance}`);
      console.log(`Bob decrypted Alice's score: ${clearScore}`);
    });
  });

  describe("Update Multiple Values", function () {
    it("should update multiple values atomically", async function () {
      // Create initial profile
      const initInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(1000n)
        .add32(100n)
        .add32(1n)
        .add32(0n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .createProfile(
          initInput.handles[0],
          initInput.handles[1],
          initInput.handles[2],
          initInput.handles[3],
          initInput.inputProof
        )
      ).wait();

      // Update balance and score together
      const newBalance = 5000n;
      const newScore = 500n;

      const updateInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(newBalance)
        .add32(newScore)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .updateBalanceAndScore(
          updateInput.handles[0],
          updateInput.handles[1],
          updateInput.inputProof
        )
      ).wait();

      // Verify updates
      const [encBalance, encScore] = await contract.connect(signers.alice).getMyProfile();

      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encBalance,
        contractAddress,
        signers.alice
      );

      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encScore,
        contractAddress,
        signers.alice
      );

      expect(clearBalance).to.eq(newBalance);
      expect(clearScore).to.eq(newScore);

      console.log(`Updated balance: ${clearBalance}, score: ${clearScore}`);
    });
  });

  describe("Add to Multiple Values", function () {
    it("should add to balance and score, decrypt new values", async function () {
      const initialBalance = 1000n;
      const initialScore = 100n;

      // Create profile
      const initInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(initialBalance)
        .add32(initialScore)
        .add32(1n)
        .add32(1n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .createProfile(
          initInput.handles[0],
          initInput.handles[1],
          initInput.handles[2],
          initInput.handles[3],
          initInput.inputProof
        )
      ).wait();

      // Add to values
      const addBalance = 500n;
      const addScore = 50n;

      const addInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(addBalance)
        .add32(addScore)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .addToBalanceAndScore(
          addInput.handles[0],
          addInput.handles[1],
          addInput.inputProof
        )
      ).wait();

      // Get and decrypt
      const [encBalance, encScore] = await contract.connect(signers.alice).getMyProfile();

      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encBalance,
        contractAddress,
        signers.alice
      );

      const clearScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encScore,
        contractAddress,
        signers.alice
      );

      expect(clearBalance).to.eq(initialBalance + addBalance);
      expect(clearScore).to.eq(initialScore + addScore);

      console.log(`New balance: ${clearBalance} (${initialBalance} + ${addBalance})`);
      console.log(`New score: ${clearScore} (${initialScore} + ${addScore})`);
    });
  });

  describe("Summary", function () {
    it("summarizes multi-value user decryption", async function () {
      console.log("\n=== Multi-Value User Decryption ===\n");

      console.log("STORING MULTIPLE VALUES:");
      console.log("─────────────────────────");
      console.log("// Encrypt multiple values in one input");
      console.log("const input = await fhevm.createEncryptedInput(addr, user)");
      console.log("  .add64(balance)");
      console.log("  .add32(score)");
      console.log("  .add32(level)");
      console.log("  .encrypt();");
      console.log("");
      console.log("// Store with permissions for EACH value");
      console.log("FHE.allowThis(balance);");
      console.log("FHE.allowThis(score);");
      console.log("FHE.allow(balance, msg.sender);");
      console.log("FHE.allow(score, msg.sender);");
      console.log("");

      console.log("RETRIEVING MULTIPLE VALUES:");
      console.log("───────────────────────────");
      console.log("// Get all handles in one call");
      console.log("const [balance, score, level, premium] = await contract.getMyProfile();");
      console.log("");

      console.log("BATCH DECRYPTION:");
      console.log("─────────────────");
      console.log("// Decrypt all values (can be parallelized)");
      console.log("const clearBalance = await fhevm.userDecryptEuint(euint64, balance, ...);");
      console.log("const clearScore = await fhevm.userDecryptEuint(euint32, score, ...);");
      console.log("const clearLevel = await fhevm.userDecryptEuint(euint32, level, ...);");
      console.log("const clearPremium = await fhevm.userDecryptEbool(premium, ...);");
      console.log("");

      console.log("BENEFITS:");
      console.log("─────────");
      console.log("- One on-chain call to retrieve all handles");
      console.log("- Decryption can be done in parallel off-chain");
      console.log("- More efficient than single-value pattern");
      console.log("- Atomic updates for related values");
    });
  });
});
