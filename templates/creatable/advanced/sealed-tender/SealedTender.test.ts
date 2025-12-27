import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

async function deploySealedTenderFixture(account: HardhatEthersSigner) {
  const minBiddingPeriod = 60; // 1 minute minimum

  const contractFactory = await hre.ethers.getContractFactory("SealedTender");
  const contract = await contractFactory.connect(account).deploy(minBiddingPeriod);
  await contract.waitForDeployment();
  return contract;
}

describe("SealedTender", function () {
  let sealedTenderContract: ethers.Contract;
  let sealedTenderContractAddress: string;
  let owner: HardhatEthersSigner;
  let bidder1: HardhatEthersSigner;
  let bidder2: HardhatEthersSigner;
  let bidder3: HardhatEthersSigner;

  before(async function () {
    [owner, bidder1, bidder2, bidder3] = await hre.ethers.getSigners();

    sealedTenderContract = await deploySealedTenderFixture(owner);
    sealedTenderContractAddress = await sealedTenderContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(sealedTenderContract, "SealedTender");
  });

  describe("Setup", function () {
    it("should have correct min bidding period", async function () {
      expect(await sealedTenderContract.minBiddingPeriod()).to.eq(60);
    });

    it("should start with no tenders", async function () {
      expect(await sealedTenderContract.getTenderCount()).to.eq(0);
    });
  });

  describe("Tender Creation", function () {
    it("should create a tender", async function () {
      const tx = await sealedTenderContract.connect(owner).createTender(
        "Office Supplies",
        "Procurement of office supplies for Q1 2024",
        3600 // 1 hour duration
      );
      await tx.wait();

      expect(await sealedTenderContract.getTenderCount()).to.eq(1);
    });

    it("should return correct tender info", async function () {
      const [tenderOwner, title, deadline, state, bidCount, revealRequested, revealed, revealedLowestBid, winner] =
        await sealedTenderContract.getTender(0);

      expect(tenderOwner).to.eq(owner.address);
      expect(title).to.eq("Office Supplies");
      expect(state).to.eq(0); // TenderState.Open
      expect(bidCount).to.eq(0);
      expect(revealRequested).to.be.false;
      expect(revealed).to.be.false;
    });

    it("should reject duration too short", async function () {
      await expect(
        sealedTenderContract.createTender("Short", "Too short", 30) // Only 30 seconds
      ).to.be.revertedWith("Duration too short");
    });
  });

  describe("Bid Submission", function () {
    it("should allow bidder1 to submit bid (1000 tokens)", async function () {
      const bidAmount = 1000n;

      const input = hre.fhevm.createEncryptedInput(sealedTenderContractAddress, bidder1.address);
      input.add64(bidAmount);
      const encryptedInput = await input.encrypt();

      const tx = await sealedTenderContract.connect(bidder1).submitBid(
        0, // tenderId
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await sealedTenderContract.hasBid(0, bidder1.address)).to.be.true;
    });

    it("should allow bidder2 to submit lower bid (800 tokens)", async function () {
      const bidAmount = 800n;

      const input = hre.fhevm.createEncryptedInput(sealedTenderContractAddress, bidder2.address);
      input.add64(bidAmount);
      const encryptedInput = await input.encrypt();

      const tx = await sealedTenderContract.connect(bidder2).submitBid(
        0,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await sealedTenderContract.hasBid(0, bidder2.address)).to.be.true;
    });

    it("should allow bidder3 to submit bid (950 tokens)", async function () {
      const bidAmount = 950n;

      const input = hre.fhevm.createEncryptedInput(sealedTenderContractAddress, bidder3.address);
      input.add64(bidAmount);
      const encryptedInput = await input.encrypt();

      const tx = await sealedTenderContract.connect(bidder3).submitBid(
        0,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();
    });

    it("should update bid count", async function () {
      const [, , , , bidCount] = await sealedTenderContract.getTender(0);
      expect(bidCount).to.eq(3);
    });

    it("should return bidders list", async function () {
      const bidders = await sealedTenderContract.getBidders(0);
      expect(bidders.length).to.eq(3);
      expect(bidders).to.include(bidder1.address);
      expect(bidders).to.include(bidder2.address);
      expect(bidders).to.include(bidder3.address);
    });

    it("should reject double bid", async function () {
      const bidAmount = 700n;

      const input = hre.fhevm.createEncryptedInput(sealedTenderContractAddress, bidder1.address);
      input.add64(bidAmount);
      const encryptedInput = await input.encrypt();

      await expect(
        sealedTenderContract.connect(bidder1).submitBid(
          0,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(sealedTenderContract, "AlreadyBid");
    });

    it("should return bid time", async function () {
      const bidTime = await sealedTenderContract.getBidTime(0, bidder1.address);
      expect(bidTime).to.be.gt(0);
    });
  });

  describe("Encrypted Data Access", function () {
    it("should return encrypted lowest bid handle", async function () {
      const lowestBidHandle = await sealedTenderContract.getLowestBidHandle(0);
      expect(lowestBidHandle).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });

  describe("Tender Cancellation", function () {
    let cancelTenderId: number;

    before(async function () {
      const tx = await sealedTenderContract.createTender("Cancel Test", "For cancellation", 3600);
      await tx.wait();
      cancelTenderId = 1;
    });

    it("should cancel tender by owner", async function () {
      const tx = await sealedTenderContract.connect(owner).cancelTender(cancelTenderId);
      await tx.wait();

      const [, , , state] = await sealedTenderContract.getTender(cancelTenderId);
      expect(state).to.eq(4); // TenderState.Cancelled
    });

    it("should reject cancellation from non-owner", async function () {
      await sealedTenderContract.createTender("Another", "For test", 3600);

      await expect(
        sealedTenderContract.connect(bidder1).cancelTender(2)
      ).to.be.revertedWithCustomError(sealedTenderContract, "NotTenderOwner");
    });
  });

  describe("Winner Reveal Flow", function () {
    let revealTenderId: number;

    before(async function () {
      // Create a tender with minimum duration
      const tx = await sealedTenderContract.createTender("Quick Reveal", "For testing", 61);
      await tx.wait();
      revealTenderId = Number(await sealedTenderContract.getTenderCount()) - 1;

      // Submit a bid
      const input = hre.fhevm.createEncryptedInput(sealedTenderContractAddress, bidder1.address);
      input.add64(500n);
      const encryptedInput = await input.encrypt();

      await sealedTenderContract.connect(bidder1).submitBid(
        revealTenderId,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
    });

    it("should reject reveal before deadline", async function () {
      await expect(
        sealedTenderContract.connect(owner).requestWinnerReveal(revealTenderId)
      ).to.be.revertedWithCustomError(sealedTenderContract, "TenderNotClosed");
    });

    it("should reject reveal with no bids", async function () {
      // Create tender with no bids
      await sealedTenderContract.createTender("No Bids", "Empty tender", 61);
      const noBidsTenderId = Number(await sealedTenderContract.getTenderCount()) - 1;

      // Advance time past deadline
      await time.increase(62);

      await expect(
        sealedTenderContract.connect(owner).requestWinnerReveal(noBidsTenderId)
      ).to.be.revertedWithCustomError(sealedTenderContract, "NoBidsReceived");
    });

    it("should reject reveal from non-owner", async function () {
      await expect(
        sealedTenderContract.connect(bidder1).requestWinnerReveal(revealTenderId)
      ).to.be.revertedWithCustomError(sealedTenderContract, "NotTenderOwner");
    });
  });

  describe("Multi-Tender Support", function () {
    it("should track multiple tenders", async function () {
      const tenderCount = await sealedTenderContract.getTenderCount();
      expect(tenderCount).to.be.gte(4);
    });
  });
});
