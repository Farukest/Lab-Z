/**
 * Encrypted Addition Test Suite
 *
 * Demonstrates:
 * - Adding two encrypted values
 * - Multi-value encryption in single input
 * - Decrypting results
 */

import { EncryptedAdd, EncryptedAdd__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedAdd")) as EncryptedAdd__factory;
  const contract = (await factory.deploy()) as EncryptedAdd;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("EncryptedAdd", function () {
  let signers: Signers;
  let contract: EncryptedAdd;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  it("should add two encrypted values", async function () {
    // Values to add
    const valueA = 42n;
    const valueB = 58n;
    const expectedSum = valueA + valueB;

    // Create encrypted input with BOTH values
    // This is more efficient than two separate encryptions
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(valueA)  // First value
      .add64(valueB)  // Second value
      .encrypt();

    // Call the add function with both encrypted values
    const tx = await contract
      .connect(signers.alice)
      .add(
        encryptedInput.handles[0],  // First encrypted value
        encryptedInput.handles[1],  // Second encrypted value
        encryptedInput.inputProof   // Single proof for both
      );
    await tx.wait();

    // Get and decrypt the result
    const encryptedResult = await contract.getResult();
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      contractAddress,
      signers.alice,
    );

    expect(clearResult).to.eq(expectedSum);
    console.log(`Encrypted addition: ${valueA} + ${valueB} = ${clearResult}`);
  });

  it("should handle larger numbers", async function () {
    const valueA = 1_000_000_000n;
    const valueB = 2_500_000_000n;

    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(valueA)
      .add64(valueB)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .add(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof)
    ).wait();

    const encryptedResult = await contract.getResult();
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedResult,
      contractAddress,
      signers.alice,
    );

    expect(clearResult).to.eq(valueA + valueB);
    console.log(`Large number addition: ${valueA} + ${valueB} = ${clearResult}`);
  });
});
