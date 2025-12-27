/**
 * Boolean Operations Test Suite
 *
 * Demonstrates:
 * - Encrypted boolean (ebool) operations
 * - FHE.not() - boolean negation
 * - FHE.and() - boolean AND
 * - FHE.or() - boolean OR
 * - FHE.asEbool() - plaintext to ebool conversion
 * - Comparisons returning ebool
 */

import { BooleanOps, BooleanOps__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BooleanOps")) as BooleanOps__factory;
  const contract = (await factory.deploy()) as BooleanOps;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("BooleanOps", function () {
  let signers: Signers;
  let contract: BooleanOps;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("FHE.not() - Boolean Negation", function () {
    it("should negate true to false", async function () {
      // Create encrypted boolean: true
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(true)
        .encrypt();

      // Apply NOT operation
      await (await contract
        .connect(signers.alice)
        .notValue(encryptedInput.handles[0])
      ).wait();

      // Get and decrypt result
      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(false);
      console.log("NOT(true) = false");
    });

    it("should negate false to true", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(false)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .notValue(encryptedInput.handles[0])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(true);
      console.log("NOT(false) = true");
    });

    it("should apply NOT to stored flag", async function () {
      // Set a flag first
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(true)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBool(encryptedInput.handles[0])
      ).wait();

      // Apply NOT to stored flag
      await (await contract.connect(signers.alice).applyNot()).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(false);
    });
  });

  describe("FHE.and() - Boolean AND", function () {
    it("should return true when both are true", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(true)
        .addBool(true)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .andBools(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(true);
      console.log("true AND true = true");
    });

    it("should return false when one is false", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(true)
        .addBool(false)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .andBools(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(false);
      console.log("true AND false = false");
    });

    it("should return false when both are false", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(false)
        .addBool(false)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .andBools(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(false);
      console.log("false AND false = false");
    });
  });

  describe("FHE.or() - Boolean OR", function () {
    it("should return true when both are true", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(true)
        .addBool(true)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .orBools(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(true);
      console.log("true OR true = true");
    });

    it("should return true when one is true", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(false)
        .addBool(true)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .orBools(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(true);
      console.log("false OR true = true");
    });

    it("should return false when both are false", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(false)
        .addBool(false)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .orBools(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(false);
      console.log("false OR false = false");
    });
  });

  describe("FHE.asEbool() - Plaintext to Encrypted", function () {
    it("should convert plaintext true to encrypted", async function () {
      // Note: This reveals the value on-chain! Only for initialization
      await (await contract.connect(signers.alice).setPlainBool(true)).wait();

      const encryptedFlag = await contract.getFlag();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedFlag,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(true);
      console.log("asEbool(true) creates encrypted true");
    });

    it("should convert plaintext false to encrypted", async function () {
      await (await contract.connect(signers.alice).setPlainBool(false)).wait();

      const encryptedFlag = await contract.getFlag();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedFlag,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(false);
      console.log("asEbool(false) creates encrypted false");
    });
  });

  describe("Comparison to ebool", function () {
    it("should return true when a > b", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(100)  // a = 100
        .add8(50)   // b = 50
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .isGreater(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(true);
      console.log("100 > 50 = true (as ebool)");
    });

    it("should return false when a < b", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(30)   // a = 30
        .add8(50)   // b = 50
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .isGreater(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(false);
      console.log("30 > 50 = false (as ebool)");
    });

    it("should check equality with eq()", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(42)   // a = 42
        .add8(42)   // b = 42
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .isEqual(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(true);
      console.log("42 == 42 = true (as ebool)");
    });

    it("should return false when not equal", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(42)   // a = 42
        .add8(24)   // b = 24
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .isEqual(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEbool(
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(false);
      console.log("42 == 24 = false (as ebool)");
    });
  });

  describe("Truth Table Summary", function () {
    it("demonstrates complete boolean logic", async function () {
      console.log("\n=== Boolean Truth Tables ===");
      console.log("NOT: !true=false, !false=true");
      console.log("AND: T&&T=T, T&&F=F, F&&T=F, F&&F=F");
      console.log("OR:  T||T=T, T||F=T, F||T=T, F||F=F");
      console.log("All operations work on ENCRYPTED values!");
    });
  });
});
