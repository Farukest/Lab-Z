/**
 * ACL Demo Test Suite
 *
 * Demonstrates:
 * - Setting up encrypted secrets with proper ACL
 * - Sharing access with allow()
 * - Temporary access with allowTransient()
 * - Checking permissions with isAllowed()
 */

import { ACLDemo, ACLDemo__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ACLDemo")) as ACLDemo__factory;
  const contract = (await factory.deploy()) as ACLDemo;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ACLDemo", function () {
  let signers: Signers;
  let contract: ACLDemo;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  it("should allow owner to set and access secret", async function () {
    const secretValue = 42;

    // Alice sets the secret
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(secretValue)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .setSecret(encryptedInput.handles[0], encryptedInput.inputProof)
    ).wait();

    // Verify Alice is the owner
    expect(await contract.secretOwner()).to.eq(signers.alice.address);

    // Alice should be able to decrypt
    const encryptedSecret = await contract.getSecret();
    const decryptedSecret = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSecret,
      contractAddress,
      signers.alice,
    );

    expect(decryptedSecret).to.eq(secretValue);
    console.log(`Alice set secret: ${decryptedSecret}`);
  });

  it("should allow owner to share access with another user", async function () {
    const secretValue = 123;

    // Alice sets the secret
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(secretValue)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .setSecret(encryptedInput.handles[0], encryptedInput.inputProof)
    ).wait();

    // Initially, Bob should NOT have access
    expect(await contract.hasAccess(signers.bob.address)).to.eq(false);

    // Alice shares access with Bob
    await (await contract.connect(signers.alice).shareAccess(signers.bob.address)).wait();

    // Now Bob should have access
    expect(await contract.hasAccess(signers.bob.address)).to.eq(true);

    // Bob can decrypt
    const encryptedSecret = await contract.getSecret();
    const decryptedSecret = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSecret,
      contractAddress,
      signers.bob,
    );

    expect(decryptedSecret).to.eq(secretValue);
    console.log(`Bob decrypted shared secret: ${decryptedSecret}`);
  });

  it("should reject access sharing from non-owner", async function () {
    const secretValue = 999;

    // Alice sets the secret
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(secretValue)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .setSecret(encryptedInput.handles[0], encryptedInput.inputProof)
    ).wait();

    // Bob tries to share access with Charlie - should fail
    await expect(
      contract.connect(signers.bob).shareAccess(signers.charlie.address)
    ).to.be.revertedWith("Only owner can share");
  });

  it("should check access correctly", async function () {
    const secretValue = 777;

    // Alice sets the secret
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(secretValue)
      .encrypt();

    await (await contract
      .connect(signers.alice)
      .setSecret(encryptedInput.handles[0], encryptedInput.inputProof)
    ).wait();

    // Check access for different users
    expect(await contract.hasAccess(signers.alice.address)).to.eq(true);
    expect(await contract.hasAccess(signers.bob.address)).to.eq(false);
    expect(await contract.hasAccess(signers.charlie.address)).to.eq(false);

    // Share with Bob
    await (await contract.connect(signers.alice).shareAccess(signers.bob.address)).wait();

    expect(await contract.hasAccess(signers.bob.address)).to.eq(true);
    expect(await contract.hasAccess(signers.charlie.address)).to.eq(false);

    console.log("Access control working correctly!");
  });
});
