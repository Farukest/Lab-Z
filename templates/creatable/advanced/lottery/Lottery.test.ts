import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployLotteryFixture(account: HardhatEthersSigner) {
  const ticketPrice = hre.ethers.parseEther("0.01"); // 0.01 ETH
  const duration = 3600; // 1 hour

  const contractFactory = await hre.ethers.getContractFactory("Lottery");
  const contract = await contractFactory.connect(account).deploy(ticketPrice, duration);
  await contract.waitForDeployment();
  return contract;
}

describe("Lottery", function () {
  let lotteryContract: ethers.Contract;
  let lotteryContractAddress: string;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;
  const ticketPrice = hre.ethers.parseEther("0.01");

  before(async function () {
    [alice, bob, charlie] = await hre.ethers.getSigners();

    lotteryContract = await deployLotteryFixture(alice);
    lotteryContractAddress = await lotteryContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(lotteryContract, "Lottery");
  });

  describe("Lottery Setup", function () {
    it("should have correct ticket price", async function () {
      expect(await lotteryContract.getTicketPrice()).to.eq(ticketPrice);
    });

    it("should start with no participants", async function () {
      expect(await lotteryContract.getParticipantCount()).to.eq(0);
    });

    it("should not be drawn initially", async function () {
      expect(await lotteryContract.isDrawn()).to.be.false;
    });
  });

  describe("Entering Lottery", function () {
    it("should allow alice to enter with correct payment", async function () {
      const tx = await lotteryContract.connect(alice).enter({ value: ticketPrice });
      await tx.wait();

      expect(await lotteryContract.hasEntered(alice.address)).to.be.true;
      expect(await lotteryContract.getParticipantCount()).to.eq(1);
    });

    it("should allow bob to enter", async function () {
      const tx = await lotteryContract.connect(bob).enter({ value: ticketPrice });
      await tx.wait();

      expect(await lotteryContract.hasEntered(bob.address)).to.be.true;
      expect(await lotteryContract.getParticipantCount()).to.eq(2);
    });

    it("should allow charlie to enter", async function () {
      const tx = await lotteryContract.connect(charlie).enter({ value: ticketPrice });
      await tx.wait();

      expect(await lotteryContract.hasEntered(charlie.address)).to.be.true;
      expect(await lotteryContract.getParticipantCount()).to.eq(3);
    });

    it("should reject insufficient payment", async function () {
      const [, , , dave] = await hre.ethers.getSigners();
      const lowPayment = hre.ethers.parseEther("0.001"); // Too low

      await expect(
        lotteryContract.connect(dave).enter({ value: lowPayment })
      ).to.be.revertedWithCustomError(lotteryContract, "InsufficientPayment");
    });

    it("should prevent double entry", async function () {
      await expect(
        lotteryContract.connect(alice).enter({ value: ticketPrice })
      ).to.be.revertedWithCustomError(lotteryContract, "AlreadyEntered");
    });
  });

  describe("Prize Pool", function () {
    it("should accumulate prize pool", async function () {
      const expectedPool = ticketPrice * 3n; // 3 participants
      expect(await lotteryContract.getPrizePool()).to.eq(expectedPool);
    });
  });

  describe("Drawing Winner", function () {
    it("should allow drawing after enough participants", async function () {
      const tx = await lotteryContract.draw();
      await tx.wait();

      expect(await lotteryContract.isDrawn()).to.be.true;
    });

    it("should prevent drawing twice", async function () {
      await expect(
        lotteryContract.draw()
      ).to.be.revertedWithCustomError(lotteryContract, "LotteryAlreadyDrawn");
    });

    it("should prevent entering after draw", async function () {
      const [, , , , eve] = await hre.ethers.getSigners();
      await expect(
        lotteryContract.connect(eve).enter({ value: ticketPrice })
      ).to.be.revertedWithCustomError(lotteryContract, "LotteryAlreadyDrawn");
    });

    it("should return encrypted winner index handle", async function () {
      const encryptedIndex = await lotteryContract.getEncryptedWinnerIndex();
      // Verify it's a non-zero handle
      expect(encryptedIndex).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });

  describe("Reveal Status", function () {
    it("should not be revealed initially", async function () {
      expect(await lotteryContract.isRevealed()).to.be.false;
    });

    it("should not be claimed initially", async function () {
      expect(await lotteryContract.isClaimed()).to.be.false;
    });

    // Note: Full reveal flow requires async decryption with Zama KMS
    // which cannot be fully tested in mock mode
  });
});
