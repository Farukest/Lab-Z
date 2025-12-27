import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployMysteryBoxFixture(account: HardhatEthersSigner) {
  const boxPrice = hre.ethers.parseEther("0.1");
  const maxSupply = 100;

  const contractFactory = await hre.ethers.getContractFactory("MysteryBox");
  const contract = await contractFactory.connect(account).deploy(boxPrice, maxSupply);
  await contract.waitForDeployment();
  return contract;
}

describe("MysteryBox", function () {
  let mysteryBoxContract: ethers.Contract;
  let mysteryBoxContractAddress: string;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  const boxPrice = hre.ethers.parseEther("0.1");

  before(async function () {
    [owner, alice, bob] = await hre.ethers.getSigners();

    mysteryBoxContract = await deployMysteryBoxFixture(owner);
    mysteryBoxContractAddress = await mysteryBoxContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(mysteryBoxContract, "MysteryBox");
  });

  describe("Setup", function () {
    it("should have correct box price", async function () {
      expect(await mysteryBoxContract.boxPrice()).to.eq(boxPrice);
    });

    it("should have correct max supply", async function () {
      expect(await mysteryBoxContract.maxSupply()).to.eq(100);
    });

    it("should start with no boxes", async function () {
      expect(await mysteryBoxContract.getBoxCount()).to.eq(0);
    });

    it("should have full remaining supply", async function () {
      expect(await mysteryBoxContract.getRemainingSupply()).to.eq(100);
    });

    it("should return correct tier probabilities", async function () {
      const [legendary, epic, rare, common] = await mysteryBoxContract.getTierProbabilities();
      expect(legendary).to.eq(5);
      expect(epic).to.eq(15);
      expect(rare).to.eq(25);
      expect(common).to.eq(55);
    });
  });

  describe("Purchasing Boxes", function () {
    it("should allow alice to purchase a box", async function () {
      const tx = await mysteryBoxContract.connect(alice).purchaseBox({ value: boxPrice });
      await tx.wait();

      expect(await mysteryBoxContract.getBoxCount()).to.eq(1);
      expect(await mysteryBoxContract.getRemainingSupply()).to.eq(99);
    });

    it("should return correct box info", async function () {
      const [boxOwner, revealed, purchasedAt] = await mysteryBoxContract.getBox(0);
      expect(boxOwner).to.eq(alice.address);
      expect(revealed).to.be.false;
      expect(purchasedAt).to.be.gt(0);
    });

    it("should track user boxes", async function () {
      const userBoxes = await mysteryBoxContract.getUserBoxes(alice.address);
      expect(userBoxes.length).to.eq(1);
      expect(userBoxes[0]).to.eq(0);
    });

    it("should allow bob to purchase multiple boxes", async function () {
      await mysteryBoxContract.connect(bob).purchaseBox({ value: boxPrice });
      await mysteryBoxContract.connect(bob).purchaseBox({ value: boxPrice });

      const userBoxes = await mysteryBoxContract.getUserBoxes(bob.address);
      expect(userBoxes.length).to.eq(2);
      expect(await mysteryBoxContract.getBoxCount()).to.eq(3);
    });

    it("should reject insufficient payment", async function () {
      const lowPayment = hre.ethers.parseEther("0.05");
      await expect(
        mysteryBoxContract.connect(alice).purchaseBox({ value: lowPayment })
      ).to.be.revertedWithCustomError(mysteryBoxContract, "InsufficientPayment");
    });
  });

  describe("Revealing Boxes", function () {
    it("should reveal alice's box", async function () {
      const tx = await mysteryBoxContract.connect(alice).revealBox(0);
      await tx.wait();

      const [, revealed] = await mysteryBoxContract.getBox(0);
      expect(revealed).to.be.true;
    });

    it("should reject duplicate reveal", async function () {
      await expect(
        mysteryBoxContract.connect(alice).revealBox(0)
      ).to.be.revertedWithCustomError(mysteryBoxContract, "BoxAlreadyRevealed");
    });

    it("should reject reveal from non-owner", async function () {
      await expect(
        mysteryBoxContract.connect(alice).revealBox(1) // Bob's box
      ).to.be.revertedWithCustomError(mysteryBoxContract, "NotBoxOwner");
    });

    it("should reject reveal of non-existent box", async function () {
      await expect(
        mysteryBoxContract.connect(alice).revealBox(999)
      ).to.be.revertedWithCustomError(mysteryBoxContract, "BoxNotFound");
    });
  });

  describe("Rarity Tier Check", function () {
    it("should return encrypted tier indicators", async function () {
      // Bob reveals his box first
      await mysteryBoxContract.connect(bob).revealBox(1);

      const tx = await mysteryBoxContract.connect(bob).getRarityTier(1);
      const receipt = await tx.wait();

      // The function should return without error
      expect(receipt.status).to.eq(1);
    });

    it("should reject tier check from non-owner", async function () {
      await expect(
        mysteryBoxContract.connect(alice).getRarityTier(1) // Bob's box
      ).to.be.revertedWithCustomError(mysteryBoxContract, "NotBoxOwner");
    });
  });

  describe("Box Transfer", function () {
    it("should transfer box from bob to alice", async function () {
      // Bob transfers his second box to alice
      const tx = await mysteryBoxContract.connect(bob).transferBox(2, alice.address);
      await tx.wait();

      const [newOwner] = await mysteryBoxContract.getBox(2);
      expect(newOwner).to.eq(alice.address);
    });

    it("should reject transfer from non-owner", async function () {
      await expect(
        mysteryBoxContract.connect(bob).transferBox(0, bob.address) // Alice's box
      ).to.be.revertedWithCustomError(mysteryBoxContract, "NotBoxOwner");
    });
  });
});
