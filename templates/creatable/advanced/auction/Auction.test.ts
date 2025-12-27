import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployAuctionFixture(account: HardhatEthersSigner) {
  const itemDescription = "Rare NFT Collection";
  const durationSeconds = 3600; // 1 hour

  const contractFactory = await hre.ethers.getContractFactory("Auction");
  const contract = await contractFactory.connect(account).deploy(itemDescription, durationSeconds);
  await contract.waitForDeployment();
  return contract;
}

describe("Auction", function () {
  let auctionContract: ethers.Contract;
  let auctionContractAddress: string;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  before(async function () {
    [owner, alice, bob, charlie] = await hre.ethers.getSigners();

    auctionContract = await deployAuctionFixture(owner);
    auctionContractAddress = await auctionContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(auctionContract, "Auction");
  });

  describe("Auction Setup", function () {
    it("should have correct item description", async function () {
      expect(await auctionContract.itemDescription()).to.eq("Rare NFT Collection");
    });

    it("should have correct end time", async function () {
      const endTime = await auctionContract.auctionEndTime();
      expect(endTime).to.be.gt(0);
    });

    it("should start with no bidders", async function () {
      expect(await auctionContract.bidderCount()).to.eq(0);
    });

    it("should not be finalized initially", async function () {
      expect(await auctionContract.isFinalized()).to.be.false;
    });
  });

  describe("Bidding", function () {
    it("should allow alice to place a bid (100 tokens)", async function () {
      const bidAmount = 100n;

      const input = hre.fhevm.createEncryptedInput(auctionContractAddress, alice.address);
      input.add64(bidAmount);
      const encryptedInput = await input.encrypt();

      const tx = await auctionContract.connect(alice).bid(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await auctionContract.hasBid(alice.address)).to.be.true;
      expect(await auctionContract.bidderCount()).to.eq(1);
    });

    it("should allow bob to place a higher bid (200 tokens)", async function () {
      const bidAmount = 200n;

      const input = hre.fhevm.createEncryptedInput(auctionContractAddress, bob.address);
      input.add64(bidAmount);
      const encryptedInput = await input.encrypt();

      const tx = await auctionContract.connect(bob).bid(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await auctionContract.hasBid(bob.address)).to.be.true;
      expect(await auctionContract.bidderCount()).to.eq(2);
    });

    it("should allow charlie to place a bid (150 tokens)", async function () {
      const bidAmount = 150n;

      const input = hre.fhevm.createEncryptedInput(auctionContractAddress, charlie.address);
      input.add64(bidAmount);
      const encryptedInput = await input.encrypt();

      const tx = await auctionContract.connect(charlie).bid(
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await auctionContract.hasBid(charlie.address)).to.be.true;
      expect(await auctionContract.bidderCount()).to.eq(3);
    });

    it("should reject double bidding", async function () {
      const bidAmount = 300n;

      const input = hre.fhevm.createEncryptedInput(auctionContractAddress, alice.address);
      input.add64(bidAmount);
      const encryptedInput = await input.encrypt();

      await expect(
        auctionContract.connect(alice).bid(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(auctionContract, "AlreadyBid");
    });

    it("should return encrypted bid for bidder", async function () {
      const encryptedBid = await auctionContract.getBid(alice.address);
      expect(encryptedBid).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("should return encrypted highest bid handle", async function () {
      const highestBid = await auctionContract.getHighestBid();
      expect(highestBid).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });

  describe("Reveal Status (before auction ends)", function () {
    it("should not allow reveal request before auction ends", async function () {
      await expect(
        auctionContract.requestWinnerReveal()
      ).to.be.revertedWithCustomError(auctionContract, "AuctionNotEnded");
    });

    it("should not be revealed initially", async function () {
      expect(await auctionContract.isRevealed()).to.be.false;
    });

    it("should not be reveal requested initially", async function () {
      expect(await auctionContract.isRevealRequested()).to.be.false;
    });
  });
});
