import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { PredictionMarketERC7984, ERC7984Example } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PredictionMarketERC7984", function () {
  let market: PredictionMarketERC7984;
  let token: ERC7984Example;
  let owner: HardhatEthersSigner;
  let bettor1: HardhatEthersSigner;
  let bettor2: HardhatEthersSigner;
  let bettor3: HardhatEthersSigner;

  const BET_AMOUNT = 100n;
  const MARKET_DURATION = 86400; // 1 day

  beforeEach(async function () {
    [owner, bettor1, bettor2, bettor3] = await ethers.getSigners();

    // Deploy token
    const TokenFactory = await ethers.getContractFactory("ERC7984Example");
    token = await TokenFactory.deploy(
      owner.address,
      100000n,
      "Betting Token",
      "BET",
      "https://example.com/bet"
    );
    await token.waitForDeployment();

    // Distribute tokens
    for (const bettor of [bettor1, bettor2, bettor3]) {
      await token.mint(bettor.address, 1000n);
    }

    // Deploy prediction market
    const MarketFactory = await ethers.getContractFactory("PredictionMarketERC7984");
    market = await MarketFactory.deploy();
    await market.waitForDeployment();

    // Set market as operator (use blockchain time)
    const currentTime = await time.latest();
    const futureTime = currentTime + MARKET_DURATION * 2;
    for (const bettor of [bettor1, bettor2, bettor3]) {
      await token.connect(bettor).setOperator(await market.getAddress(), futureTime);
    }
  });

  describe("Market Creation", function () {
    it("should create a market", async function () {
      await expect(
        market.connect(owner).createMarket(
          "Will ETH reach $10k?",
          await token.getAddress(),
          MARKET_DURATION
        )
      )
        .to.emit(market, "MarketCreated")
        .withArgs(0, "Will ETH reach $10k?");
    });

    it("should increment market counter", async function () {
      await market.connect(owner).createMarket(
        "Market 1",
        await token.getAddress(),
        MARKET_DURATION
      );
      await market.connect(owner).createMarket(
        "Market 2",
        await token.getAddress(),
        MARKET_DURATION
      );

      expect(await market.getMarketCount()).to.equal(2);
    });

    it("should store market info correctly", async function () {
      await market.connect(owner).createMarket(
        "Test Market",
        await token.getAddress(),
        MARKET_DURATION
      );

      const marketInfo = await market.getMarket(0);
      expect(marketInfo.description).to.equal("Test Market");
      expect(marketInfo.bettingToken).to.equal(await token.getAddress());
      expect(marketInfo.state).to.equal(0); // Open
    });

    it("should reject market creation from non-owner", async function () {
      await expect(
        market.connect(bettor1).createMarket(
          "Unauthorized Market",
          await token.getAddress(),
          MARKET_DURATION
        )
      ).to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });
  });

  describe("Placing Bets", function () {
    let marketId: number;

    beforeEach(async function () {
      await market.connect(owner).createMarket(
        "Will it rain tomorrow?",
        await token.getAddress(),
        MARKET_DURATION
      );
      marketId = 0;
    });

    it("should place YES bet", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();

      await expect(
        market.connect(bettor1).placeBet(
          marketId,
          true, // YES
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      )
        .to.emit(market, "BetPlaced")
        .withArgs(marketId, bettor1.address, true);
    });

    it("should place NO bet", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor2.address)
        .add64(BET_AMOUNT)
        .encrypt();

      await expect(
        market.connect(bettor2).placeBet(
          marketId,
          false, // NO
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      )
        .to.emit(market, "BetPlaced")
        .withArgs(marketId, bettor2.address, false);
    });

    it("should allow multiple bets from same user", async function () {
      const input1 = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();

      await market.connect(bettor1).placeBet(
        marketId,
        true,
        input1.handles[0],
        input1.inputProof
      );

      const input2 = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();

      await expect(
        market.connect(bettor1).placeBet(
          marketId,
          true,
          input2.handles[0],
          input2.inputProof
        )
      ).to.not.be.reverted;
    });

    it("should reject bet after market end time", async function () {
      await time.increase(MARKET_DURATION + 1);

      const encryptedInput = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();

      await expect(
        market.connect(bettor1).placeBet(
          marketId,
          true,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(market, "MarketNotOpen");
    });

    it("should reject bet on closed market", async function () {
      await market.connect(owner).closeMarket(marketId);

      const encryptedInput = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();

      await expect(
        market.connect(bettor1).placeBet(
          marketId,
          true,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(market, "MarketNotOpen");
    });

    it("should track user bets", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();

      await market.connect(bettor1).placeBet(
        marketId,
        true,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      const userBet = await market.getUserBet(marketId, bettor1.address);
      expect(userBet.yesAmount).to.not.equal(0n);
      expect(userBet.claimed).to.equal(false);
    });
  });

  describe("Market Resolution", function () {
    let marketId: number;

    beforeEach(async function () {
      await market.connect(owner).createMarket(
        "Resolution Test",
        await token.getAddress(),
        MARKET_DURATION
      );
      marketId = 0;

      // Place some bets
      const input1 = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();
      await market.connect(bettor1).placeBet(marketId, true, input1.handles[0], input1.inputProof);

      const input2 = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor2.address)
        .add64(BET_AMOUNT)
        .encrypt();
      await market.connect(bettor2).placeBet(marketId, false, input2.handles[0], input2.inputProof);
    });

    it("should resolve market with YES outcome", async function () {
      await expect(market.connect(owner).resolveMarket(marketId, true))
        .to.emit(market, "MarketResolved")
        .withArgs(marketId, true);

      const marketInfo = await market.getMarket(marketId);
      expect(marketInfo.state).to.equal(2); // Resolved
      expect(marketInfo.outcome).to.equal(true);
    });

    it("should resolve market with NO outcome", async function () {
      await expect(market.connect(owner).resolveMarket(marketId, false))
        .to.emit(market, "MarketResolved")
        .withArgs(marketId, false);

      const marketInfo = await market.getMarket(marketId);
      expect(marketInfo.outcome).to.equal(false);
    });

    it("should reject resolution from non-owner", async function () {
      await expect(market.connect(bettor1).resolveMarket(marketId, true))
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });

    it("should reject double resolution", async function () {
      await market.connect(owner).resolveMarket(marketId, true);

      await expect(market.connect(owner).resolveMarket(marketId, false))
        .to.be.revertedWithCustomError(market, "MarketAlreadyResolved");
    });
  });

  describe("Claiming Winnings", function () {
    let marketId: number;

    beforeEach(async function () {
      await market.connect(owner).createMarket(
        "Claim Test",
        await token.getAddress(),
        MARKET_DURATION
      );
      marketId = 0;

      // Bettor1 bets YES
      const input1 = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();
      await market.connect(bettor1).placeBet(marketId, true, input1.handles[0], input1.inputProof);

      // Bettor2 bets NO
      const input2 = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor2.address)
        .add64(BET_AMOUNT)
        .encrypt();
      await market.connect(bettor2).placeBet(marketId, false, input2.handles[0], input2.inputProof);
    });

    it("should reject claim before resolution", async function () {
      await expect(market.connect(bettor1).claimWinnings(marketId))
        .to.be.revertedWithCustomError(market, "MarketNotResolved");
    });

    it("should allow winner to claim", async function () {
      await market.connect(owner).resolveMarket(marketId, true); // YES wins

      await expect(market.connect(bettor1).claimWinnings(marketId))
        .to.emit(market, "WinningsClaimed")
        .withArgs(marketId, bettor1.address);
    });

    it("should reject double claim", async function () {
      await market.connect(owner).resolveMarket(marketId, true);
      await market.connect(bettor1).claimWinnings(marketId);

      await expect(market.connect(bettor1).claimWinnings(marketId))
        .to.be.revertedWithCustomError(market, "AlreadyClaimed");
    });

    it("should mark bet as claimed", async function () {
      await market.connect(owner).resolveMarket(marketId, true);
      await market.connect(bettor1).claimWinnings(marketId);

      const userBet = await market.getUserBet(marketId, bettor1.address);
      expect(userBet.claimed).to.equal(true);
    });
  });

  describe("Market Management", function () {
    let marketId: number;

    beforeEach(async function () {
      await market.connect(owner).createMarket(
        "Management Test",
        await token.getAddress(),
        MARKET_DURATION
      );
      marketId = 0;
    });

    it("should close market", async function () {
      await market.connect(owner).closeMarket(marketId);

      const marketInfo = await market.getMarket(marketId);
      expect(marketInfo.state).to.equal(1); // Closed
    });

    it("should reject close from non-owner", async function () {
      await expect(market.connect(bettor1).closeMarket(marketId))
        .to.be.revertedWithCustomError(market, "OwnableUnauthorizedAccount");
    });

    it("should reject close on already closed market", async function () {
      await market.connect(owner).closeMarket(marketId);

      await expect(market.connect(owner).closeMarket(marketId))
        .to.be.revertedWithCustomError(market, "MarketNotOpen");
    });
  });

  describe("View Functions", function () {
    it("should return market totals", async function () {
      await market.connect(owner).createMarket(
        "Totals Test",
        await token.getAddress(),
        MARKET_DURATION
      );

      const input = await fhevm
        .createEncryptedInput(await market.getAddress(), bettor1.address)
        .add64(BET_AMOUNT)
        .encrypt();
      await market.connect(bettor1).placeBet(0, true, input.handles[0], input.inputProof);

      const [totalYes, totalNo] = await market.getMarketTotals(0);
      expect(totalYes).to.not.equal(0n);
    });

    it("should return correct market count", async function () {
      expect(await market.getMarketCount()).to.equal(0);

      await market.connect(owner).createMarket("M1", await token.getAddress(), MARKET_DURATION);
      await market.connect(owner).createMarket("M2", await token.getAddress(), MARKET_DURATION);

      expect(await market.getMarketCount()).to.equal(2);
    });
  });
});
