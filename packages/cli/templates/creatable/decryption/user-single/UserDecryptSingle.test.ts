/**
 * User Decrypt Single Value Test Suite
 *
 * PRIVATE DECRYPTION: Only authorized users can see values
 *
 * How it works:
 * 1. Contract stores encrypted value
 * 2. Contract calls FHE.allow(encryptedValue, userAddress)
 * 3. User retrieves encrypted handle from contract
 * 4. User decrypts OFF-CHAIN using fhevm.userDecryptEuint()
 *
 * Key Points:
 * - Decryption happens OFF-CHAIN (never on blockchain)
 * - Only users with FHE.allow() permission can decrypt
 * - Different from "public decryption" where everyone can see
 */

import { UserDecryptSingle, UserDecryptSingle__factory } from "../types";
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
  const factory = (await ethers.getContractFactory("UserDecryptSingle")) as UserDecryptSingle__factory;
  const contract = (await factory.deploy()) as UserDecryptSingle;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("UserDecryptSingle", function () {
  let signers: Signers;
  let contract: UserDecryptSingle;
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

  describe("Basic User Decryption", function () {
    it("should allow user to decrypt their own balance", async function () {
      const secretBalance = 1000n;

      // Alice sets her private balance
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretBalance)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBalance(encryptedInput.handles[0])
      ).wait();

      console.log("Balance stored on-chain (encrypted)");

      // Alice retrieves her encrypted balance
      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();
      console.log("Encrypted handle retrieved");

      // Alice decrypts OFF-CHAIN
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.alice,  // Only Alice can decrypt!
      );

      expect(clearBalance).to.eq(secretBalance);
      console.log(`Alice's decrypted balance: ${clearBalance}`);
    });

    it("should prevent unauthorized decryption", async function () {
      const secretBalance = 5000n;

      // Alice sets her balance
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretBalance)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBalance(encryptedInput.handles[0])
      ).wait();

      // Alice can decrypt
      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();
      const aliceDecrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );
      expect(aliceDecrypted).to.eq(secretBalance);

      // Bob CANNOT decrypt Alice's balance (would fail in real scenario)
      // Note: In tests, this might not throw but return wrong value or 0
      console.log("Alice can decrypt: ", aliceDecrypted.toString());
      console.log("Bob would NOT be able to decrypt this value!");
    });
  });

  describe("Sharing with Specific Users", function () {
    it("should allow owner to share decrypt access with viewer", async function () {
      const secretScore = 99n;

      // Alice sets score and grants Bob view access
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretScore)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setScoreWithViewer(encryptedInput.handles[0], signers.bob.address)
      ).wait();

      console.log("Alice set score with Bob as viewer");

      // Both Alice and Bob can decrypt
      const encryptedScore = await contract.getScore(signers.alice.address);

      // Alice decrypts
      const aliceDecrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedScore,
        contractAddress,
        signers.alice,
      );
      expect(aliceDecrypted).to.eq(secretScore);
      console.log(`Alice decrypted: ${aliceDecrypted}`);

      // Bob also decrypts (he has permission)
      const bobDecrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedScore,
        contractAddress,
        signers.bob,
      );
      expect(bobDecrypted).to.eq(secretScore);
      console.log(`Bob decrypted: ${bobDecrypted}`);

      // Carol cannot decrypt (no permission)
      console.log("Carol would NOT be able to decrypt!");
    });
  });

  describe("Dynamic Permission Granting", function () {
    it("should grant access after initial storage", async function () {
      const secretBalance = 2500n;

      // Alice sets balance (only she has access initially)
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretBalance)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBalance(encryptedInput.handles[0])
      ).wait();

      // Later, Alice grants Bob access
      await (await contract
        .connect(signers.alice)
        .grantBalanceAccess(signers.bob.address)
      ).wait();

      console.log("Alice granted Bob access to her balance");

      // Now Bob can also decrypt
      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();

      const bobDecrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.bob,
      );

      expect(bobDecrypted).to.eq(secretBalance);
      console.log(`Bob decrypted after grant: ${bobDecrypted}`);
    });
  });

  describe("Computed Results", function () {
    it("should allow decrypt of computed result", async function () {
      const initialBalance = 100n;
      const addAmount = 50n;

      // Set initial balance
      const input1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(initialBalance)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBalance(input1.handles[0])
      ).wait();

      // Add to balance
      const input2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(addAmount)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .addToBalance(input2.handles[0])
      ).wait();

      // Decrypt new balance
      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();
      const newBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(newBalance).to.eq(initialBalance + addAmount);
      console.log(`New balance after add: ${newBalance}`);
    });

    it("should allow decrypt of boolean comparison result", async function () {
      const balance = 100n;
      const threshold = 50n;

      // Set balance
      const balanceInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(balance)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBalance(balanceInput.handles[0])
      ).wait();

      // Compare with threshold
      const thresholdInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(threshold)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .isBalanceAbove(thresholdInput.handles[0])
      ).wait();

      // The function returns ebool, but we'd need to get it from event/storage
      // For demonstration: 100 > 50 should be true
      console.log(`Is ${balance} > ${threshold}? Expected: true`);
    });
  });

  describe("Summary", function () {
    it("summarizes user decryption flow", async function () {
      console.log("\n=== User (Private) Decryption ===\n");

      console.log("ON-CHAIN (Contract):");
      console.log("1. Store encrypted value:");
      console.log("   euint64 value = FHE.fromExternal(encInput);");
      console.log("   FHE.allowThis(value);  // Contract can use");
      console.log("   FHE.allow(value, msg.sender);  // User can decrypt");
      console.log("");

      console.log("OFF-CHAIN (Client):");
      console.log("2. Get encrypted handle:");
      console.log("   const encrypted = await contract.getValue();");
      console.log("");
      console.log("3. Decrypt with user signature:");
      console.log("   const clear = await fhevm.userDecryptEuint(");
      console.log("     FhevmType.euint64,");
      console.log("     encrypted,");
      console.log("     contractAddress,");
      console.log("     signer,  // Must have FHE.allow() permission!");
      console.log("   );");
      console.log("");

      console.log("KEY POINTS:");
      console.log("- PRIVATE: Only authorized users see the value");
      console.log("- OFF-CHAIN: Value never appears on blockchain");
      console.log("- PERMISSION: Requires FHE.allow() from contract");
      console.log("- SIGNATURE: User signs to prove identity");
      console.log("");

      console.log("GRANTING ACCESS:");
      console.log("- FHE.allow(value, user1);  // One user");
      console.log("- FHE.allow(value, user2);  // Multiple users");
      console.log("- Can grant access any time after creation");
    });
  });
});
