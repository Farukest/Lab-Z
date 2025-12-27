import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

async function deployPredictionMarketFixture(account: HardhatEthersSigner) {
  const minBetAmount = 10;

  const contractFactory = await hre.ethers.getContractFactory("PredictionMarket");
  const contract = await contractFactory.connect(account).deploy(account.address, minBetAmount);
  await contract.waitForDeployment();
  return contract;
}

describe("PredictionMarket", function () {
  let predictionMarketContract: ethers.Contract;
  let predictionMarketContractAddress: string;
  let oracle: HardhatEthersSigner;
  let bettor1: HardhatEthersSigner;
  let bettor2: HardhatEthersSigner;
  let bettor3: HardhatEthersSigner;

  before(async function () {
    [oracle, bettor1, bettor2, bettor3] = await hre.ethers.getSigners();

    predictionMarketContract = await deployPredictionMarketFixture(oracle);
    predictionMarketContractAddress = await predictionMarketContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(predictionMarketContract, "PredictionMarket");
  });

  describe("Setup", function () {
    it("should have correct oracle", async function () {
      expect(await predictionMarketContract.oracle()).to.eq(oracle.address);
    });

    it("should have correct min bet amount", async function () {
      expect(await predictionMarketContract.minBetAmount()).to.eq(10);
    });

    it("should start with no markets", async function () {
      expect(await predictionMarketContract.getMarketCount()).to.eq(0);
    });
  });

  describe("Market Creation", function () {
    it("should create a market", async function () {
      const question = "Will ETH reach $5000 by end of 2024?";
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

      const tx = await predictionMarketContract.connect(oracle).createMarket(question, deadline);
      await tx.wait();

      expect(await predictionMarketContract.getMarketCount()).to.eq(1);
    });

    it("should return correct market info", async function () {
      const [question, deadline, resolved, outcome, yesCount, noCount, poolsDecrypted] =
        await predictionMarketContract.getMarket(0);

      expect(question).to.eq("Will ETH reach $5000 by end of 2024?");
      expect(resolved).to.be.false;
      expect(yesCount).to.eq(0);
      expect(noCount).to.eq(0);
      expect(poolsDecrypted).to.be.false;
    });

    it("should reject past deadline", async function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600;

      await expect(
        predictionMarketContract.createMarket("Past question?", pastDeadline)
      ).to.be.revertedWith("Deadline must be future");
    });
  });

  describe("Placing Bets", function () {
    it("should allow bettor1 to bet YES", async function () {
      const betAmount = 100n;

      const input = hre.fhevm.createEncryptedInput(predictionMarketContractAddress, bettor1.address);
      input.add64(betAmount);
      const encryptedInput = await input.encrypt();

      const tx = await predictionMarketContract.connect(bettor1).placeBet(
        0, // marketId
        true, // YES
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      const [, , , , yesCount] = await predictionMarketContract.getMarket(0);
      expect(yesCount).to.eq(1);
    });

    it("should allow bettor2 to bet NO", async function () {
      const betAmount = 150n;

      const input = hre.fhevm.createEncryptedInput(predictionMarketContractAddress, bettor2.address);
      input.add64(betAmount);
      const encryptedInput = await input.encrypt();

      const tx = await predictionMarketContract.connect(bettor2).placeBet(
        0,
        false, // NO
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      const [, , , , , noCount] = await predictionMarketContract.getMarket(0);
      expect(noCount).to.eq(1);
    });

    it("should allow bettor3 to bet YES", async function () {
      const betAmount = 200n;

      const input = hre.fhevm.createEncryptedInput(predictionMarketContractAddress, bettor3.address);
      input.add64(betAmount);
      const encryptedInput = await input.encrypt();

      const tx = await predictionMarketContract.connect(bettor3).placeBet(
        0,
        true,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      const [, , , , yesCount] = await predictionMarketContract.getMarket(0);
      expect(yesCount).to.eq(2);
    });

    it("should reject bet on resolved market", async function () {
      // Create a market with 60 second duration
      const currentTime = await time.latest();
      const deadline = currentTime + 60;
      await predictionMarketContract.createMarket("Quick resolve?", deadline);

      // Advance time past deadline
      await time.increase(61);

      // Resolve it
      await predictionMarketContract.connect(oracle).resolveMarket(1, true);

      // Try to bet
      const betAmount = 100n;
      const input = hre.fhevm.createEncryptedInput(predictionMarketContractAddress, bettor1.address);
      input.add64(betAmount);
      const encryptedInput = await input.encrypt();

      await expect(
        predictionMarketContract.connect(bettor1).placeBet(
          1,
          true,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(predictionMarketContract, "MarketAlreadyResolved");
    });
  });

  describe("Market Resolution", function () {
    let resolveMarketId: number;

    before(async function () {
      // Create a market with 60 second deadline
      const currentTime = await time.latest();
      const deadline = currentTime + 60;
      await predictionMarketContract.createMarket("Will test pass?", deadline);
      resolveMarketId = 2;

      // Place a bet
      const input = hre.fhevm.createEncryptedInput(predictionMarketContractAddress, bettor1.address);
      input.add64(100n);
      const encryptedInput = await input.encrypt();

      await predictionMarketContract.connect(bettor1).placeBet(
        resolveMarketId,
        true,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      // Advance time past deadline
      await time.increase(61);
    });

    it("should resolve market", async function () {
      const tx = await predictionMarketContract.connect(oracle).resolveMarket(resolveMarketId, true);
      await tx.wait();

      const [, , resolved, outcome] = await predictionMarketContract.getMarket(resolveMarketId);
      expect(resolved).to.be.true;
      expect(outcome).to.be.true;
    });

    it("should reject non-oracle resolution", async function () {
      const currentTime = await time.latest();
      const deadline = currentTime + 60;
      await predictionMarketContract.createMarket("Another market", deadline);

      await time.increase(61);

      await expect(
        predictionMarketContract.connect(bettor1).resolveMarket(3, true)
      ).to.be.revertedWith("Only oracle");
    });

    it("should reject double resolution", async function () {
      await expect(
        predictionMarketContract.connect(oracle).resolveMarket(resolveMarketId, false)
      ).to.be.revertedWithCustomError(predictionMarketContract, "MarketAlreadyResolved");
    });
  });

  describe("Pool Decryption", function () {
    let decryptMarketId: number;

    before(async function () {
      // Create and resolve a market for decryption testing
      const currentTime = await time.latest();
      const deadline = currentTime + 60;
      const tx = await predictionMarketContract.createMarket("Decrypt test?", deadline);
      await tx.wait();

      decryptMarketId = Number(await predictionMarketContract.getMarketCount()) - 1;

      // Place a bet
      const input = hre.fhevm.createEncryptedInput(predictionMarketContractAddress, bettor1.address);
      input.add64(100n);
      const encryptedInput = await input.encrypt();

      await predictionMarketContract.connect(bettor1).placeBet(
        decryptMarketId,
        true,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      // Advance time and resolve
      await time.increase(61);
      await predictionMarketContract.connect(oracle).resolveMarket(decryptMarketId, true);
    });

    it("should set decrypted pools", async function () {
      const tx = await predictionMarketContract.connect(oracle).setDecryptedPools(decryptMarketId, 100, 0);
      await tx.wait();

      const [yesPool, noPool] = await predictionMarketContract.getDecryptedPools(decryptMarketId);
      expect(yesPool).to.eq(100);
      expect(noPool).to.eq(0);
    });

    it("should reject non-oracle decryption", async function () {
      // Create another resolved market
      const currentTime = await time.latest();
      const deadline = currentTime + 60;
      await predictionMarketContract.createMarket("Another decrypt?", deadline);
      const newMarketId = Number(await predictionMarketContract.getMarketCount()) - 1;

      await time.increase(61);
      await predictionMarketContract.connect(oracle).resolveMarket(newMarketId, false);

      await expect(
        predictionMarketContract.connect(bettor1).setDecryptedPools(newMarketId, 0, 0)
      ).to.be.revertedWith("Only oracle");
    });
  });

  describe("Claim Status", function () {
    it("should not be claimed initially", async function () {
      expect(await predictionMarketContract.hasClaimed(0, bettor1.address)).to.be.false;
    });
  });
});
