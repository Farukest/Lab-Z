import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployAgeGateFixture(account: HardhatEthersSigner) {
  const validityPeriod = 86400; // 1 day
  const contractFactory = await hre.ethers.getContractFactory("AgeGate");
  const contract = await contractFactory.connect(account).deploy(validityPeriod);
  await contract.waitForDeployment();
  return contract;
}

describe("AgeGate", function () {
  let ageGateContract: ethers.Contract;
  let ageGateContractAddress: string;
  let issuer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let verifier: HardhatEthersSigner;

  before(async function () {
    [issuer, alice, verifier] = await hre.ethers.getSigners();

    ageGateContract = await deployAgeGateFixture(issuer);
    ageGateContractAddress = await ageGateContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(ageGateContract, "AgeGate");
  });

  describe("Issuer Management", function () {
    it("should have deployer as initial issuer", async function () {
      expect(await ageGateContract.isIssuer(issuer.address)).to.be.true;
    });

    it("should allow issuer to add new issuer", async function () {
      const [, , , newIssuer] = await hre.ethers.getSigners();
      const tx = await ageGateContract.connect(issuer).addIssuer(newIssuer.address);
      await tx.wait();
      expect(await ageGateContract.isIssuer(newIssuer.address)).to.be.true;
    });

    it("should allow issuer to remove issuer", async function () {
      const [, , , newIssuer] = await hre.ethers.getSigners();
      const tx = await ageGateContract.connect(issuer).removeIssuer(newIssuer.address);
      await tx.wait();
      expect(await ageGateContract.isIssuer(newIssuer.address)).to.be.false;
    });

    it("should reject non-issuer from adding issuers", async function () {
      await expect(
        ageGateContract.connect(alice).addIssuer(alice.address)
      ).to.be.revertedWithCustomError(ageGateContract, "NotAuthorizedIssuer");
    });
  });

  describe("Birth Date Registration", function () {
    it("should register birth date for user", async function () {
      // Birth date: Jan 1, 2000 (Unix timestamp)
      const birthDate = 946684800n; // 2000-01-01

      const input = hre.fhevm.createEncryptedInput(ageGateContractAddress, issuer.address);
      input.add64(birthDate);
      const encryptedInput = await input.encrypt();

      const tx = await ageGateContract.connect(issuer).registerBirthDate(
        alice.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await ageGateContract.hasBirthDateRegistered(alice.address)).to.be.true;
    });

    it("should reject duplicate birth date registration", async function () {
      const birthDate = 946684800n;

      const input = hre.fhevm.createEncryptedInput(ageGateContractAddress, issuer.address);
      input.add64(birthDate);
      const encryptedInput = await input.encrypt();

      await expect(
        ageGateContract.connect(issuer).registerBirthDate(
          alice.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(ageGateContract, "BirthDateAlreadyRegistered");
    });

    it("should return correct identity info", async function () {
      const [identityIssuer, registeredAt, active] = await ageGateContract.getIdentity(alice.address);
      expect(identityIssuer).to.eq(issuer.address);
      expect(active).to.be.true;
      expect(registeredAt).to.be.gt(0);
    });
  });

  describe("Age Verification", function () {
    it("should verify age meets requirement (18+)", async function () {
      // Alice was born in 2000, so she's 24+ years old in 2024
      const tx = await ageGateContract.connect(alice).verifyAge(18, verifier.address);
      const receipt = await tx.wait();

      // Get verification ID from event
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "AgeVerified"
      );
      expect(event).to.not.be.undefined;
    });

    it("should reject invalid age requirement (0)", async function () {
      await expect(
        ageGateContract.connect(alice).verifyAge(0, verifier.address)
      ).to.be.revertedWithCustomError(ageGateContract, "InvalidAgeRequirement");
    });

    it("should reject invalid age requirement (>150)", async function () {
      await expect(
        ageGateContract.connect(alice).verifyAge(151, verifier.address)
      ).to.be.revertedWithCustomError(ageGateContract, "InvalidAgeRequirement");
    });

    it("should reject verification from user without birth date", async function () {
      const [, , , , noIdentity] = await hre.ethers.getSigners();
      await expect(
        ageGateContract.connect(noIdentity).verifyAge(18, verifier.address)
      ).to.be.revertedWithCustomError(ageGateContract, "BirthDateNotRegistered");
    });
  });

  describe("Access Control", function () {
    it("should grant access based on age", async function () {
      const resourceId = ethers.id("adult_content");
      const tx = await ageGateContract.connect(alice).grantAccess(resourceId, 18);
      await tx.wait();

      // Event should be emitted
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "AccessGranted"
      );
      expect(event).to.not.be.undefined;
    });
  });
});
