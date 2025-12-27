import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployPokerFixture(account: HardhatEthersSigner) {
  const minBuyIn = hre.ethers.parseEther("0.1");

  const contractFactory = await hre.ethers.getContractFactory("Poker");
  const contract = await contractFactory.connect(account).deploy(minBuyIn);
  await contract.waitForDeployment();
  return contract;
}

describe("Poker", function () {
  let pokerContract: ethers.Contract;
  let pokerContractAddress: string;
  let owner: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;
  let player3: HardhatEthersSigner;
  const buyIn = hre.ethers.parseEther("0.5");

  before(async function () {
    [owner, player1, player2, player3] = await hre.ethers.getSigners();

    pokerContract = await deployPokerFixture(owner);
    pokerContractAddress = await pokerContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(pokerContract, "Poker");
  });

  describe("Setup", function () {
    it("should have correct min buy-in", async function () {
      expect(await pokerContract.minBuyIn()).to.eq(hre.ethers.parseEther("0.1"));
    });

    it("should start with no games", async function () {
      expect(await pokerContract.getGameCount()).to.eq(0);
    });
  });

  describe("Game Creation", function () {
    it("should create a new poker game", async function () {
      const tx = await pokerContract.connect(player1).createGame(buyIn);
      await tx.wait();

      expect(await pokerContract.getGameCount()).to.eq(1);
    });

    it("should have player1 as first player", async function () {
      const [playerCount, phase, gameBuyIn] = await pokerContract.getGame(0);
      expect(playerCount).to.eq(1);
      expect(phase).to.eq(0); // GamePhase.Waiting
      expect(gameBuyIn).to.eq(buyIn);
    });

    it("should confirm player1 is in game", async function () {
      expect(await pokerContract.isPlayerInGame(0, player1.address)).to.be.true;
    });

    it("should reject buy-in below minimum", async function () {
      const lowBuyIn = hre.ethers.parseEther("0.01");
      await expect(
        pokerContract.connect(player1).createGame(lowBuyIn)
      ).to.be.revertedWith("Buy-in too low");
    });
  });

  describe("Joining Game", function () {
    it("should allow player2 to join", async function () {
      const tx = await pokerContract.connect(player2).joinGame(0);
      await tx.wait();

      const [playerCount] = await pokerContract.getGame(0);
      expect(playerCount).to.eq(2);
      expect(await pokerContract.isPlayerInGame(0, player2.address)).to.be.true;
    });

    it("should allow player3 to join", async function () {
      const tx = await pokerContract.connect(player3).joinGame(0);
      await tx.wait();

      const [playerCount] = await pokerContract.getGame(0);
      expect(playerCount).to.eq(3);
    });

    it("should reject double join", async function () {
      await expect(
        pokerContract.connect(player1).joinGame(0)
      ).to.be.revertedWithCustomError(pokerContract, "AlreadyInGame");
    });

    it("should reject joining non-existent game", async function () {
      await expect(
        pokerContract.connect(player1).joinGame(999)
      ).to.be.revertedWithCustomError(pokerContract, "GameNotFound");
    });
  });

  describe("Dealing Cards", function () {
    it("should deal cards to all players", async function () {
      const tx = await pokerContract.dealCards(0);
      await tx.wait();

      const [, phase] = await pokerContract.getGame(0);
      expect(phase).to.eq(1); // GamePhase.PreFlop
    });

    it("should reject dealing to already started game", async function () {
      await expect(
        pokerContract.dealCards(0)
      ).to.be.revertedWithCustomError(pokerContract, "GameAlreadyStarted");
    });

    it("should reject dealing with insufficient players", async function () {
      // Create new game with only 1 player
      await pokerContract.connect(player1).createGame(buyIn);

      await expect(
        pokerContract.dealCards(1)
      ).to.be.revertedWithCustomError(pokerContract, "InsufficientPlayers");
    });
  });

  describe("Betting", function () {
    it("should allow current player to place bet", async function () {
      // Get current turn from game state
      const [, , , currentTurn] = await pokerContract.getGame(0);
      const players = [player1, player2, player3];
      const currentPlayer = players[Number(currentTurn)];

      const betAmount = 100n;
      const input = hre.fhevm.createEncryptedInput(pokerContractAddress, currentPlayer.address);
      input.add64(betAmount);
      const encryptedInput = await input.encrypt();

      const tx = await pokerContract.connect(currentPlayer).placeBet(
        0,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();
    });

    it("should reject bet from non-current player", async function () {
      const betAmount = 100n;

      const input = hre.fhevm.createEncryptedInput(pokerContractAddress, owner.address);
      input.add64(betAmount);
      const encryptedInput = await input.encrypt();

      await expect(
        pokerContract.connect(owner).placeBet(
          0,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(pokerContract, "NotInGame");
    });
  });

  describe("Folding", function () {
    it("should allow current player to fold", async function () {
      const [, , , currentTurn] = await pokerContract.getGame(0);
      const players = [player1, player2, player3];
      const currentPlayer = players[Number(currentTurn)];

      const tx = await pokerContract.connect(currentPlayer).fold(0);
      await tx.wait();

      expect(await pokerContract.hasPlayerFolded(0, currentPlayer.address)).to.be.true;
    });
  });

  describe("Multi-Game Support", function () {
    it("should track multiple games", async function () {
      // Create a few more games
      await pokerContract.connect(player1).createGame(buyIn);
      await pokerContract.connect(player2).createGame(buyIn);

      const gameCount = await pokerContract.getGameCount();
      expect(gameCount).to.be.gte(3);
    });
  });
});
