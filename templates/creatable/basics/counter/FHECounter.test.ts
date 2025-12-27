/**
 * FHE Counter Test Suite
 *
 * This test demonstrates:
 * - Deploying an FHEVM contract
 * - Creating encrypted inputs client-side
 * - Calling contract functions with encrypted values
 * - Decrypting results using userDecryptEuint
 */

import { FHECounter, FHECounter__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

/**
 * Deploy a fresh instance of the FHECounter contract
 * Called before each test for isolation
 */
async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHECounter")) as FHECounter__factory;
  const fheCounterContract = (await factory.deploy()) as FHECounter;
  const fheCounterContractAddress = await fheCounterContract.getAddress();

  return { fheCounterContract, fheCounterContractAddress };
}

describe("FHECounter", function () {
  let signers: Signers;
  let fheCounterContract: FHECounter;
  let fheCounterContractAddress: string;

  before(async function () {
    // Initialize test signers
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async () => {
    // Deploy fresh contract before each test
    ({ fheCounterContract, fheCounterContractAddress } = await deployFixture());
  });

  it("should be deployed successfully", async function () {
    console.log(`FHECounter deployed at: ${fheCounterContractAddress}`);
    expect(ethers.isAddress(fheCounterContractAddress)).to.eq(true);
  });

  it("should have uninitialized count after deployment", async function () {
    // An uninitialized euint32 returns bytes32(0)
    const encryptedCount = await fheCounterContract.getCount();
    expect(encryptedCount).to.eq(ethers.ZeroHash);
  });

  it("should increment the counter by encrypted value", async function () {
    const encryptedCountBefore = await fheCounterContract.getCount();
    expect(encryptedCountBefore).to.eq(ethers.ZeroHash);
    const clearCountBefore = 0;

    // Create encrypted input: encrypt the value 5
    const clearValue = 5;
    const encryptedInput = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    // Call increment with encrypted value and proof
    const tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    // Get and decrypt the new count
    const encryptedCountAfter = await fheCounterContract.getCount();
    const clearCountAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfter,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfter).to.eq(clearCountBefore + clearValue);
    console.log(`Counter incremented: ${clearCountBefore} + ${clearValue} = ${clearCountAfter}`);
  });

  it("should decrement the counter by encrypted value", async function () {
    // First, increment to have something to decrement
    const incrementValue = 10;
    const encryptedIncrement = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(incrementValue)
      .encrypt();

    let tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedIncrement.handles[0], encryptedIncrement.inputProof);
    await tx.wait();

    // Now decrement by 3
    const decrementValue = 3;
    const encryptedDecrement = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(decrementValue)
      .encrypt();

    tx = await fheCounterContract
      .connect(signers.alice)
      .decrement(encryptedDecrement.handles[0], encryptedDecrement.inputProof);
    await tx.wait();

    // Verify the result
    const encryptedCount = await fheCounterContract.getCount();
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCount).to.eq(incrementValue - decrementValue);
    console.log(`Counter after operations: ${incrementValue} - ${decrementValue} = ${clearCount}`);
  });

  it("should allow multiple users to interact with different permissions", async function () {
    // Alice increments
    const aliceValue = 7;
    const aliceEncrypted = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(aliceValue)
      .encrypt();

    await (await fheCounterContract
      .connect(signers.alice)
      .increment(aliceEncrypted.handles[0], aliceEncrypted.inputProof)).wait();

    // Bob increments
    const bobValue = 3;
    const bobEncrypted = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.bob.address)
      .add32(bobValue)
      .encrypt();

    await (await fheCounterContract
      .connect(signers.bob)
      .increment(bobEncrypted.handles[0], bobEncrypted.inputProof)).wait();

    // Bob can decrypt the result (he was the last one to call, so he has permission)
    const encryptedCount = await fheCounterContract.getCount();
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      fheCounterContractAddress,
      signers.bob,
    );

    expect(clearCount).to.eq(aliceValue + bobValue);
    console.log(`Total count after Alice (${aliceValue}) and Bob (${bobValue}): ${clearCount}`);
  });
});
