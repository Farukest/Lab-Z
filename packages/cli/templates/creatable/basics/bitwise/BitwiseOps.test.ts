/**
 * Bitwise Operations Test Suite
 *
 * Demonstrates:
 * - FHE.and() - Bitwise AND on encrypted integers
 * - FHE.or() - Bitwise OR on encrypted integers
 * - FHE.xor() - Bitwise XOR on encrypted integers
 * - FHE.shl() - Shift left (multiply by 2^n)
 * - FHE.shr() - Shift right (divide by 2^n)
 */

import { BitwiseOps, BitwiseOps__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BitwiseOps")) as BitwiseOps__factory;
  const contract = (await factory.deploy()) as BitwiseOps;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("BitwiseOps", function () {
  let signers: Signers;
  let contract: BitwiseOps;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("FHE.and() - Bitwise AND", function () {
    it("should AND two encrypted values", async function () {
      // 0b10101010 (170) AND 0b11110000 (240) = 0b10100000 (160)
      const a = 170n;
      const b = 240n;
      const expected = a & b;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(a)
        .add8(b)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .bitwiseAnd(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult8();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(expected);
      console.log(`${a} (0b${a.toString(2)}) AND ${b} (0b${b.toString(2)}) = ${clearResult} (0b${clearResult.toString(2)})`);
    });

    it("should apply bitmask to extract bits", async function () {
      // Extract lower 4 bits: 0b11010110 (214) & 0b00001111 (15) = 0b00000110 (6)
      const value = 214n;
      const mask = 15n; // Lower 4 bits mask

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .applyMask(encryptedInput.handles[0], Number(mask))
      ).wait();

      const encryptedResult = await contract.getResult8();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(6n);
      console.log(`Extract lower 4 bits of ${value}: ${clearResult}`);
    });
  });

  describe("FHE.or() - Bitwise OR", function () {
    it("should OR two encrypted values", async function () {
      // 0b10100000 (160) OR 0b00001010 (10) = 0b10101010 (170)
      const a = 160n;
      const b = 10n;
      const expected = a | b;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(a)
        .add8(b)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .bitwiseOr(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult8();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(expected);
      console.log(`${a} OR ${b} = ${clearResult}`);
    });

    it("should set specific bits using OR", async function () {
      // Set bit 1: 0b00000001 (1) OR 0b00000010 (2) = 0b00000011 (3)
      const value = 1n;
      const bitsToSet = 2n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBits(encryptedInput.handles[0], Number(bitsToSet))
      ).wait();

      const encryptedResult = await contract.getResult8();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(3n);
      console.log(`Set bit 1 of ${value}: ${clearResult}`);
    });
  });

  describe("FHE.xor() - Bitwise XOR", function () {
    it("should XOR two encrypted values", async function () {
      // 0b10101010 (170) XOR 0b11001100 (204) = 0b01100110 (102)
      const a = 170n;
      const b = 204n;
      const expected = a ^ b;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(a)
        .add8(b)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .bitwiseXor(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult8();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(expected);
      console.log(`${a} XOR ${b} = ${clearResult}`);
    });

    it("should toggle specific bits using XOR", async function () {
      // Toggle bit 0: 0b00000011 (3) XOR 0b00000001 (1) = 0b00000010 (2)
      const value = 3n;
      const bitsToToggle = 1n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .toggleBits(encryptedInput.handles[0], Number(bitsToToggle))
      ).wait();

      const encryptedResult = await contract.getResult8();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(2n);
      console.log(`Toggle bit 0 of ${value}: ${clearResult}`);
    });

    it("should demonstrate XOR properties", async function () {
      // XOR with itself = 0
      const value = 123n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(value)
        .add8(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .bitwiseXor(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult8();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(0n);
      console.log(`${value} XOR ${value} = 0 (XOR with itself)`);
    });
  });

  describe("FHE.shl() - Shift Left", function () {
    it("should shift left (multiply by power of 2)", async function () {
      // 1 << 3 = 8 (1 * 2^3)
      const value = 1n;
      const positions = 3;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .shiftLeft(encryptedInput.handles[0], positions)
      ).wait();

      const encryptedResult = await contract.getResult64();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(8n);
      console.log(`${value} << ${positions} = ${clearResult}`);
    });

    it("should multiply by power of 2 efficiently", async function () {
      // 5 * 2^4 = 80
      const value = 5n;
      const power = 4;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .multiplyByPowerOf2(encryptedInput.handles[0], power)
      ).wait();

      const encryptedResult = await contract.getResult64();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(80n);
      console.log(`${value} * 2^${power} = ${clearResult}`);
    });
  });

  describe("FHE.shr() - Shift Right", function () {
    it("should shift right (divide by power of 2)", async function () {
      // 64 >> 3 = 8 (64 / 2^3)
      const value = 64n;
      const positions = 3;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .shiftRight(encryptedInput.handles[0], positions)
      ).wait();

      const encryptedResult = await contract.getResult64();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(8n);
      console.log(`${value} >> ${positions} = ${clearResult}`);
    });

    it("should divide by power of 2 efficiently", async function () {
      // 100 / 2^2 = 25
      const value = 100n;
      const power = 2;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .divideByPowerOf2(encryptedInput.handles[0], power)
      ).wait();

      const encryptedResult = await contract.getResult64();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(25n);
      console.log(`${value} / 2^${power} = ${clearResult}`);
    });

    it("should floor when not evenly divisible", async function () {
      // 7 >> 1 = 3 (7/2 = 3.5 floored)
      const value = 7n;
      const positions = 1;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .shiftRight(encryptedInput.handles[0], positions)
      ).wait();

      const encryptedResult = await contract.getResult64();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(3n);
      console.log(`${value} >> ${positions} = ${clearResult} (floored from 3.5)`);
    });
  });

  describe("Use Cases", function () {
    it("demonstrates permission flags", async function () {
      // Encode permissions as bits: READ=1, WRITE=2, EXECUTE=4, ADMIN=8
      const READ = 1n;
      const WRITE = 2n;
      const EXECUTE = 4n;

      // User has READ and EXECUTE: 0b0101 = 5
      const userPerms = READ | EXECUTE;

      // Check if user has WRITE permission using AND
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(userPerms)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .applyMask(encryptedInput.handles[0], Number(WRITE))
      ).wait();

      const encryptedResult = await contract.getResult8();
      const hasWrite = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(hasWrite).to.eq(0n); // No WRITE permission
      console.log(`User permissions: ${userPerms}, has WRITE: ${hasWrite > 0n}`);
    });

    it("demonstrates efficient power-of-2 math", async function () {
      // Calculate: (value * 8) / 4 = value * 2
      // Using shifts: (value << 3) >> 2 = value << 1
      const value = 10n;

      // First multiply by 8 (shift left 3)
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .multiplyByPowerOf2(encryptedInput.handles[0], 3)
      ).wait();

      let encryptedResult = await contract.getResult64();
      let clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(80n);
      console.log(`Step 1: ${value} * 8 = ${clearResult}`);

      // Then divide by 4 (shift right 2)
      const step2Input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearResult)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .divideByPowerOf2(step2Input.handles[0], 2)
      ).wait();

      encryptedResult = await contract.getResult64();
      clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(20n);
      console.log(`Step 2: 80 / 4 = ${clearResult}`);
    });
  });

  describe("Summary", function () {
    it("summarizes bitwise operations", async function () {
      console.log("\n=== Bitwise Operations ===");
      console.log("FHE.and(a, b): Bitwise AND - extract/mask bits");
      console.log("FHE.or(a, b):  Bitwise OR - set bits");
      console.log("FHE.xor(a, b): Bitwise XOR - toggle bits");
      console.log("FHE.shl(a, n): Shift left - multiply by 2^n");
      console.log("FHE.shr(a, n): Shift right - divide by 2^n");
      console.log("\nUse cases:");
      console.log("- Permission flags and bitfields");
      console.log("- Efficient power-of-2 math");
      console.log("- Bit manipulation and masking");
      console.log("- Cryptographic operations");
    });
  });
});
