import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployDiceGameFixture(account: HardhatEthersSigner) {
  const minBet = hre.ethers.parseEther("0.01");
  const maxBet = hre.ethers.parseEther("1");
  const houseEdge = 200; // 2%

  const contractFactory = await hre.ethers.getContractFactory("DiceGame");
  const contract = await contractFactory.connect(account).deploy(minBet, maxBet, houseEdge);
  await contract.waitForDeployment();
  return contract;
}

describe("DiceGame", function () {
  let diceGameContract: ethers.Contract;
  let diceGameContractAddress: string;
  let owner: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;
  const betAmount = hre.ethers.parseEther("0.05");

  before(async function () {
    [owner, player1, player2] = await hre.ethers.getSigners();

    diceGameContract = await deployDiceGameFixture(owner);
    diceGameContractAddress = await diceGameContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(diceGameContract, "DiceGame");

    // Fund the house
    await diceGameContract.fundHouse({ value: hre.ethers.parseEther("10") });
  });

  describe("Setup", function () {
    it("should have correct min bet", async function () {
      expect(await diceGameContract.minBet()).to.eq(hre.ethers.parseEther("0.01"));
    });

    it("should have correct max bet", async function () {
      expect(await diceGameContract.maxBet()).to.eq(hre.ethers.parseEther("1"));
    });

    it("should have house balance", async function () {
      expect(await diceGameContract.getHouseBalance()).to.eq(hre.ethers.parseEther("10"));
    });

    it("should start with no games", async function () {
      expect(await diceGameContract.getGameCount()).to.eq(0);
    });
  });

  describe("Placing Bets", function () {
    it("should allow OverUnder bet", async function () {
      // BetType.OverUnder = 0, prediction = 7 (betting total > 7)
      const tx = await diceGameContract.connect(player1).placeBet(0, 7, { value: betAmount });
      await tx.wait();

      expect(await diceGameContract.getGameCount()).to.eq(1);
    });

    it("should allow Exact bet", async function () {
      // BetType.Exact = 1, prediction = 7 (betting total = 7)
      const tx = await diceGameContract.connect(player1).placeBet(1, 7, { value: betAmount });
      await tx.wait();

      expect(await diceGameContract.getGameCount()).to.eq(2);
    });

    it("should allow HighLow bet (low)", async function () {
      // BetType.HighLow = 2, prediction = 0 (betting low: 2-6)
      const tx = await diceGameContract.connect(player2).placeBet(2, 0, { value: betAmount });
      await tx.wait();

      expect(await diceGameContract.getGameCount()).to.eq(3);
    });

    it("should allow HighLow bet (high)", async function () {
      // BetType.HighLow = 2, prediction = 1 (betting high: 8-12)
      const tx = await diceGameContract.connect(player2).placeBet(2, 1, { value: betAmount });
      await tx.wait();

      expect(await diceGameContract.getGameCount()).to.eq(4);
    });

    it("should reject insufficient bet", async function () {
      const lowBet = hre.ethers.parseEther("0.001");
      await expect(
        diceGameContract.connect(player1).placeBet(0, 7, { value: lowBet })
      ).to.be.revertedWithCustomError(diceGameContract, "InsufficientBet");
    });

    it("should reject bet exceeding max", async function () {
      const highBet = hre.ethers.parseEther("2");
      await expect(
        diceGameContract.connect(player1).placeBet(0, 7, { value: highBet })
      ).to.be.revertedWithCustomError(diceGameContract, "InsufficientBet");
    });
  });

  describe("Game State", function () {
    it("should return correct game info", async function () {
      const [player, betType, prediction, betAmt, revealRequested, revealed, revealedWon, claimed, payout] =
        await diceGameContract.getGame(0);

      expect(player).to.eq(player1.address);
      expect(betType).to.eq(0); // OverUnder
      expect(prediction).to.eq(7);
      expect(betAmt).to.eq(betAmount);
      expect(revealRequested).to.be.false;
      expect(revealed).to.be.false;
    });

    it("should return encrypted win handle", async function () {
      const winHandle = await diceGameContract.getWinHandle(0);
      expect(winHandle).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });

  describe("Reveal Flow", function () {
    it("should request result reveal", async function () {
      const tx = await diceGameContract.connect(player1).requestResultReveal(0);
      await tx.wait();

      const [, , , , revealRequested] = await diceGameContract.getGame(0);
      expect(revealRequested).to.be.true;
    });

    it("should reject duplicate reveal request", async function () {
      await expect(
        diceGameContract.connect(player1).requestResultReveal(0)
      ).to.be.revertedWithCustomError(diceGameContract, "GameAlreadyRevealed");
    });

    it("should reject reveal request from non-player", async function () {
      await expect(
        diceGameContract.connect(owner).requestResultReveal(1)
      ).to.be.revertedWithCustomError(diceGameContract, "NotGamePlayer");
    });

    it("should reject claim before reveal", async function () {
      await expect(
        diceGameContract.connect(player1).claimWinnings(1)
      ).to.be.revertedWithCustomError(diceGameContract, "GameNotRevealed");
    });
  });

  describe("Payout Calculations", function () {
    it("should calculate OverUnder payout (1.95x)", async function () {
      const payout = await diceGameContract.calculatePayout(0, betAmount);
      const expected = (betAmount * 19500n) / 10000n;
      expect(payout).to.eq(expected);
    });

    it("should calculate Exact payout (5x)", async function () {
      const payout = await diceGameContract.calculatePayout(1, betAmount);
      const expected = (betAmount * 50000n) / 10000n;
      expect(payout).to.eq(expected);
    });

    it("should calculate HighLow payout (1.9x)", async function () {
      const payout = await diceGameContract.calculatePayout(2, betAmount);
      const expected = (betAmount * 19000n) / 10000n;
      expect(payout).to.eq(expected);
    });
  });

  describe("House Funding", function () {
    it("should accept house funds via receive", async function () {
      const initialBalance = await diceGameContract.getHouseBalance();

      await owner.sendTransaction({
        to: diceGameContractAddress,
        value: hre.ethers.parseEther("1")
      });

      const newBalance = await diceGameContract.getHouseBalance();
      expect(newBalance).to.eq(initialBalance + hre.ethers.parseEther("1"));
    });
  });
});
