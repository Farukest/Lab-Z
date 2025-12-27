/**
 * Multiply Operations Test Suite
 *
 * Demonstrates:
 * - FHE.mul() - encrypted multiplication
 * - FHE.div() - encrypted division (integer)
 * - FHE.rem() - encrypted modulo (remainder)
 * - Scalar operations with plaintext values
 * - Combined operations (divmod, percentage)
 */

import { MultiplyOps, MultiplyOps__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("MultiplyOps")) as MultiplyOps__factory;
  const contract = (await factory.deploy()) as MultiplyOps;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("MultiplyOps", function () {
  let signers: Signers;
  let contract: MultiplyOps;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("FHE.mul() - Multiplication", function () {
    it("should multiply two encrypted values", async function () {
      const a = 7n;
      const b = 8n;
      const expected = a * b;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(a)
        .add64(b)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .multiply(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(expected);
      console.log(`${a} * ${b} = ${clearResult}`);
    });

    it("should handle multiplication by zero", async function () {
      const a = 12345n;
      const b = 0n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(a)
        .add64(b)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .multiply(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(0n);
      console.log(`${a} * 0 = 0`);
    });

    it("should multiply by plaintext scalar", async function () {
      const encrypted = 100n;
      const scalar = 15n; // 15x multiplier

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(encrypted)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .multiplyByScalar(encryptedInput.handles[0], scalar)
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(encrypted * scalar);
      console.log(`${encrypted} * ${scalar}(scalar) = ${clearResult}`);
    });
  });

  describe("FHE.div() - Division", function () {
    it("should divide two encrypted values", async function () {
      const dividend = 100n;
      const divisor = 7n;
      const expected = dividend / divisor; // Integer division: 14

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(dividend)
        .add64(divisor)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .divide(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(expected);
      console.log(`${dividend} / ${divisor} = ${clearResult} (integer division)`);
    });

    it("should floor the result", async function () {
      const dividend = 10n;
      const divisor = 3n;
      // 10 / 3 = 3.33... but integer division gives 3

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(dividend)
        .add64(divisor)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .divide(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(3n);
      console.log(`10 / 3 = 3 (floored from 3.33...)`);
    });

    it("should divide by plaintext scalar", async function () {
      const dividend = 1000n;
      const scalar = 100n; // Divide by 100

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(dividend)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .divideByScalar(encryptedInput.handles[0], scalar)
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(10n);
      console.log(`${dividend} / ${scalar}(scalar) = ${clearResult}`);
    });
  });

  describe("FHE.rem() - Modulo (Remainder)", function () {
    it("should calculate remainder", async function () {
      const dividend = 17n;
      const divisor = 5n;
      const expected = dividend % divisor; // 17 % 5 = 2

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(dividend)
        .add64(divisor)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .modulo(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(expected);
      console.log(`${dividend} % ${divisor} = ${clearResult}`);
    });

    it("should return 0 when evenly divisible", async function () {
      const dividend = 20n;
      const divisor = 5n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(dividend)
        .add64(divisor)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .modulo(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(0n);
      console.log(`${dividend} % ${divisor} = 0 (evenly divisible)`);
    });

    it("should modulo by plaintext scalar", async function () {
      const dividend = 123n;
      const scalar = 10n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(dividend)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .moduloByScalar(encryptedInput.handles[0], scalar)
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(3n);
      console.log(`${dividend} % ${scalar}(scalar) = ${clearResult}`);
    });
  });

  describe("Combined Operations", function () {
    it("should calculate both quotient and remainder (divmod)", async function () {
      const dividend = 47n;
      const divisor = 10n;
      // 47 / 10 = 4 remainder 7

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(dividend)
        .add64(divisor)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .divMod(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedQuotient = await contract.getQuotient();
      const encryptedRemainder = await contract.getRemainder();

      const quotient = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedQuotient,
        contractAddress,
        signers.alice,
      );

      const remainder = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedRemainder,
        contractAddress,
        signers.alice,
      );

      expect(quotient).to.eq(4n);
      expect(remainder).to.eq(7n);
      console.log(`${dividend} divmod ${divisor} = quotient: ${quotient}, remainder: ${remainder}`);
    });

    it("should calculate percentage", async function () {
      const value = 1000n;
      const percentage = 15n; // 15%
      // 1000 * 15 / 100 = 150

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(value)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .calculatePercentage(encryptedInput.handles[0], percentage)
      ).wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(150n);
      console.log(`${percentage}% of ${value} = ${clearResult}`);
    });
  });

  describe("Use Cases", function () {
    it("demonstrates fee calculation", async function () {
      // Calculate 3% fee on transaction
      const transactionAmount = 10000n;
      const feePercent = 3n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(transactionAmount)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .calculatePercentage(encryptedInput.handles[0], feePercent)
      ).wait();

      const encryptedResult = await contract.getResult();
      const fee = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(fee).to.eq(300n);
      console.log(`Fee on ${transactionAmount}: ${fee} (${feePercent}%)`);
    });

    it("demonstrates price per unit calculation", async function () {
      const totalPrice = 1000n;
      const quantity = 7n;
      // Price per unit = 1000 / 7 = 142 (integer)

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(totalPrice)
        .add64(quantity)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .divide(encryptedInput.handles[0], encryptedInput.handles[1])
      ).wait();

      const encryptedResult = await contract.getResult();
      const pricePerUnit = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(pricePerUnit).to.eq(142n);
      console.log(`Price per unit: ${pricePerUnit}`);
    });
  });

  describe("Summary", function () {
    it("summarizes multiplication operations", async function () {
      console.log("\n=== Multiplication Operations ===");
      console.log("FHE.mul(a, b): Multiply two encrypted values");
      console.log("FHE.div(a, b): Integer division (floors result)");
      console.log("FHE.rem(a, b): Modulo/remainder operation");
      console.log("All operations work on ENCRYPTED values!");
      console.log("\nUse cases:");
      console.log("- Fee calculations");
      console.log("- Price computations");
      console.log("- Percentage calculations");
      console.log("- Quantity distributions");
    });
  });
});
