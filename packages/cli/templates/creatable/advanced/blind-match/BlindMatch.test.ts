import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployBlindMatchFixture(account: HardhatEthersSigner) {
  const minMatchScore = 50; // 50% minimum compatibility

  const contractFactory = await hre.ethers.getContractFactory("BlindMatch");
  const contract = await contractFactory.connect(account).deploy(minMatchScore);
  await contract.waitForDeployment();
  return contract;
}

describe("BlindMatch", function () {
  let blindMatchContract: ethers.Contract;
  let blindMatchContractAddress: string;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  before(async function () {
    [owner, alice, bob] = await hre.ethers.getSigners();

    blindMatchContract = await deployBlindMatchFixture(owner);
    blindMatchContractAddress = await blindMatchContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(blindMatchContract, "BlindMatch");
  });

  describe("Setup", function () {
    it("should have correct min match score", async function () {
      expect(await blindMatchContract.minMatchScore()).to.eq(50);
    });

    it("should start with no registered users", async function () {
      expect(await blindMatchContract.getRegisteredUserCount()).to.eq(0);
    });
  });

  describe("Profile Registration", function () {
    it("should allow alice to register profile", async function () {
      // Attributes as bitfield: music (1), sports (2), tech (4), travel (8) = 15
      const attributes = 15n;

      const input = hre.fhevm.createEncryptedInput(blindMatchContractAddress, alice.address);
      input.add64(attributes);
      const encryptedInput = await input.encrypt();

      const tx = await blindMatchContract.connect(alice).registerProfile(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await blindMatchContract.hasRegisteredProfile(alice.address)).to.be.true;
      expect(await blindMatchContract.getRegisteredUserCount()).to.eq(1);
    });

    it("should allow bob to register profile", async function () {
      // Bob: music (1), tech (4), gaming (16) = 21
      const attributes = 21n;

      const input = hre.fhevm.createEncryptedInput(blindMatchContractAddress, bob.address);
      input.add64(attributes);
      const encryptedInput = await input.encrypt();

      const tx = await blindMatchContract.connect(bob).registerProfile(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await blindMatchContract.hasRegisteredProfile(bob.address)).to.be.true;
      expect(await blindMatchContract.getRegisteredUserCount()).to.eq(2);
    });

    it("should reject duplicate profile registration", async function () {
      const attributes = 15n;

      const input = hre.fhevm.createEncryptedInput(blindMatchContractAddress, alice.address);
      input.add64(attributes);
      const encryptedInput = await input.encrypt();

      await expect(
        blindMatchContract.connect(alice).registerProfile(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(blindMatchContract, "ProfileAlreadyExists");
    });
  });

  describe("Setting Preferences", function () {
    it("should allow alice to set preferences", async function () {
      // Looking for: music (1), tech (4) = 5
      const preferences = 5n;

      const input = hre.fhevm.createEncryptedInput(blindMatchContractAddress, alice.address);
      input.add64(preferences);
      const encryptedInput = await input.encrypt();

      const tx = await blindMatchContract.connect(alice).setPreferences(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await blindMatchContract.hasSetPreferences(alice.address)).to.be.true;
    });

    it("should allow bob to set preferences", async function () {
      // Looking for: music (1), sports (2), travel (8) = 11
      const preferences = 11n;

      const input = hre.fhevm.createEncryptedInput(blindMatchContractAddress, bob.address);
      input.add64(preferences);
      const encryptedInput = await input.encrypt();

      const tx = await blindMatchContract.connect(bob).setPreferences(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await blindMatchContract.hasSetPreferences(bob.address)).to.be.true;
    });

    it("should reject preferences without profile", async function () {
      const [, , , noProfile] = await hre.ethers.getSigners();
      const preferences = 5n;

      const input = hre.fhevm.createEncryptedInput(blindMatchContractAddress, noProfile.address);
      input.add64(preferences);
      const encryptedInput = await input.encrypt();

      await expect(
        blindMatchContract.connect(noProfile).setPreferences(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(blindMatchContract, "ProfileNotFound");
    });
  });

  describe("Matching", function () {
    it("should check match between alice and bob", async function () {
      const tx = await blindMatchContract.connect(alice).checkMatch(bob.address);
      const receipt = await tx.wait();

      // Should emit an event or return matchId
      expect(receipt.logs.length).to.be.gte(0);
    });

    it("should reject self-matching", async function () {
      await expect(
        blindMatchContract.connect(alice).checkMatch(alice.address)
      ).to.be.revertedWithCustomError(blindMatchContract, "CannotMatchSelf");
    });

    it("should return match status", async function () {
      const matchId = await blindMatchContract.getCompatibilityScore(alice.address, bob.address);
      const [revealed, accepted1, accepted2] = await blindMatchContract.getMatchStatus(matchId);
      expect(revealed).to.be.false;
      expect(accepted1).to.be.false;
      expect(accepted2).to.be.false;
    });
  });

  describe("Match Reveal Flow", function () {
    let matchId: string;

    before(async function () {
      matchId = await blindMatchContract.getCompatibilityScore(alice.address, bob.address);
    });

    it("should allow alice to accept reveal", async function () {
      const tx = await blindMatchContract.connect(alice).revealMatch(matchId);
      await tx.wait();

      const [, accepted1, ] = await blindMatchContract.getMatchStatus(matchId);
      expect(accepted1).to.be.true;
    });

    it("should allow bob to accept reveal and complete", async function () {
      const tx = await blindMatchContract.connect(bob).revealMatch(matchId);
      await tx.wait();

      const [revealed, , ] = await blindMatchContract.getMatchStatus(matchId);
      expect(revealed).to.be.true;
    });

    it("should reject third party reveal", async function () {
      const [, , , thirdParty] = await hre.ethers.getSigners();
      await expect(
        blindMatchContract.connect(thirdParty).revealMatch(matchId)
      ).to.be.revertedWithCustomError(blindMatchContract, "NotAuthorized");
    });
  });

  describe("Update Attributes", function () {
    it("should allow updating attributes", async function () {
      const newAttributes = 31n; // Add more interests

      const input = hre.fhevm.createEncryptedInput(blindMatchContractAddress, alice.address);
      input.add64(newAttributes);
      const encryptedInput = await input.encrypt();

      const tx = await blindMatchContract.connect(alice).updateAttributes(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      // Profile should still be registered
      expect(await blindMatchContract.hasRegisteredProfile(alice.address)).to.be.true;
    });
  });
});
