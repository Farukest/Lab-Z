/**
 * Encrypt Single Value Test Suite
 *
 * This example teaches HOW TO ENCRYPT data for FHEVM:
 *
 * 1. Client-side: Create encrypted input
 *    - Use fhevm.createEncryptedInput(contractAddress, userAddress)
 *    - Add values: .add8(), .add16(), .add32(), .add64(), .addBool()
 *    - Encrypt: .encrypt()
 *
 * 2. Send to contract:
 *    - Pass handles[0] as the encrypted value
 *    - Pass inputProof as the proof
 *
 * 3. Contract receives:
 *    - Parameter type: externalEuint* or externalEbool
 *    - Convert with FHE.fromExternal(value, inputProof)
 *    - Set permissions with FHE.allowThis() and FHE.allow()
 */

import { EncryptSingle, EncryptSingle__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptSingle")) as EncryptSingle__factory;
  const contract = (await factory.deploy()) as EncryptSingle;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("EncryptSingle", function () {
  let signers: Signers;
  let contract: EncryptSingle;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Encrypting 8-bit Integers (euint8)", function () {
    it("should encrypt and store a uint8 value", async function () {
      const secretValue = 42;

      // STEP 1: Create encrypted input on client-side
      // This encrypts your value so it can be sent securely to the contract
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(secretValue)  // Use add8 for 8-bit values (0-255)
        .encrypt();

      console.log("Encrypted input created");
      console.log("Handle:", encryptedInput.handles[0]);

      // STEP 2: Send encrypted value to contract
      // The contract receives it as externalEuint8 + inputProof
      const tx = await contract
        .connect(signers.alice)
        .storeUint8(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      console.log("Value stored on-chain (encrypted)");

      // STEP 3: Verify value was stored (decrypt to check)
      // Only alice can decrypt because FHE.allow was called for her
      const encryptedResult = await contract.getStoredUint8();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(BigInt(secretValue));
      console.log(`Decrypted value: ${decryptedValue}`);
    });

    it("should handle max uint8 value (255)", async function () {
      const maxValue = 255;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(maxValue)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .storeUint8(encryptedInput.handles[0], encryptedInput.inputProof)
      ).wait();

      const encryptedResult = await contract.getStoredUint8();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(255n);
      console.log("Max uint8 (255) stored and retrieved correctly");
    });
  });

  describe("Encrypting 64-bit Integers (euint64)", function () {
    it("should encrypt and store a uint64 value", async function () {
      // For large numbers, use BigInt (n suffix)
      const secretAmount = 1_000_000_000_000n; // 1 trillion

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretAmount)  // Use add64 for 64-bit values
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .storeUint64(encryptedInput.handles[0], encryptedInput.inputProof)
      ).wait();

      const encryptedResult = await contract.getStoredUint64();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(secretAmount);
      console.log(`Large number stored: ${decryptedValue}`);
    });
  });

  describe("Encrypting Booleans (ebool)", function () {
    it("should encrypt and store a boolean value", async function () {
      const secretFlag = true;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(secretFlag)  // Use addBool for booleans
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .storeBool(encryptedInput.handles[0], encryptedInput.inputProof)
      ).wait();

      const encryptedResult = await contract.getStoredBool();
      const decryptedValue = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(true);
      console.log(`Boolean stored: ${decryptedValue}`);
    });

    it("should store false value", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(false)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .storeBool(encryptedInput.handles[0], encryptedInput.inputProof)
      ).wait();

      const encryptedResult = await contract.getStoredBool();
      const decryptedValue = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(false);
    });
  });

  describe("Plaintext to Encrypted (WARNING: Visible!)", function () {
    it("should convert plaintext to encrypted", async function () {
      // WARNING: This value is visible in the transaction!
      // Only use for initialization with known public values
      const publicValue = 100n;

      await (await contract
        .connect(signers.alice)
        .storePlaintextAsEncrypted(publicValue)
      ).wait();

      console.log("WARNING: The value 100 was visible in the transaction data!");

      const encryptedResult = await contract.getStoredUint64();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(publicValue);
    });
  });

  describe("Access Control", function () {
    it("should allow owner to decrypt their value", async function () {
      const secretValue = 123;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(secretValue)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .storeUint8(encryptedInput.handles[0], encryptedInput.inputProof)
      ).wait();

      // Alice can decrypt her own value
      const encryptedResult = await contract.getStoredUint8();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(BigInt(secretValue));
      console.log("Alice successfully decrypted her value");
    });

    // Note: In a real test, Bob trying to decrypt would fail
    // because FHE.allow was only called for Alice
  });

  describe("Summary", function () {
    it("summarizes the encryption flow", async function () {
      console.log("\n=== Single Value Encryption Flow ===\n");

      console.log("CLIENT-SIDE:");
      console.log("1. Create encrypted input:");
      console.log("   const input = await fhevm");
      console.log("     .createEncryptedInput(contractAddr, userAddr)");
      console.log("     .add64(secretValue)");
      console.log("     .encrypt();");
      console.log("");
      console.log("2. Call contract with encrypted value AND proof:");
      console.log("   await contract.myFunction(input.handles[0], input.inputProof);");
      console.log("");

      console.log("CONTRACT-SIDE:");
      console.log("1. Receive as external type + inputProof:");
      console.log("   function myFunction(externalEuint64 encVal, bytes calldata inputProof)");
      console.log("");
      console.log("2. Convert to internal type:");
      console.log("   euint64 value = FHE.fromExternal(encVal, inputProof);");
      console.log("");
      console.log("3. Set permissions:");
      console.log("   FHE.allowThis(value);  // Contract can use");
      console.log("   FHE.allow(value, msg.sender);  // Sender can decrypt");
      console.log("");

      console.log("AVAILABLE TYPES:");
      console.log("- euint8 (0-255)");
      console.log("- euint16 (0-65535)");
      console.log("- euint32 (0-4.2B)");
      console.log("- euint64 (0-18.4 quintillion)");
      console.log("- ebool (true/false)");
    });
  });
});
