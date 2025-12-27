import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { LotteryERC7984, ERC7984Example } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("LotteryERC7984", function () {
  let lottery: LotteryERC7984;
  let token: ERC7984Example;
  let owner: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;
  let player3: HardhatEthersSigner;

  const TICKET_PRICE = 100n;
  const DURATION = 86400; // 1 day
  const INITIAL_BALANCE = 1000n;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    // Deploy token
    const TokenFactory = await ethers.getContractFactory("ERC7984Example");
    token = await TokenFactory.deploy(
      owner.address,
      10000n,
      "Lottery Token",
      "LOTTO",
      "https://example.com/lottery"
    );
    await token.waitForDeployment();

    // Distribute tokens to players
    for (const player of [player1, player2, player3]) {
      await token.mint(player.address, INITIAL_BALANCE);
    }

    // Deploy lottery
    const LotteryFactory = await ethers.getContractFactory("LotteryERC7984");
    lottery = await LotteryFactory.deploy(
      await token.getAddress(),
      TICKET_PRICE,
      DURATION
    );
    await lottery.waitForDeployment();

    // Set lottery as operator for all players (use blockchain time)
    const currentTime = await time.latest();
    const futureTime = currentTime + DURATION + 3600;
    for (const player of [player1, player2, player3]) {
      await token.connect(player).setOperator(await lottery.getAddress(), futureTime);
    }
  });

  describe("Deployment", function () {
    it("should set the correct ticket price", async function () {
      expect(await lottery.getTicketPrice()).to.equal(TICKET_PRICE);
    });

    it("should set the correct payment token", async function () {
      expect(await lottery.paymentToken()).to.equal(await token.getAddress());
    });

    it("should set the correct end time", async function () {
      const endTime = await lottery.getEndTime();
      const now = await time.latest();
      expect(endTime).to.be.closeTo(now + DURATION, 10);
    });

    it("should start with zero participants", async function () {
      expect(await lottery.getParticipantCount()).to.equal(0);
    });

    it("should not be drawn initially", async function () {
      expect(await lottery.isDrawn()).to.equal(false);
    });

    it("should not be revealed initially", async function () {
      expect(await lottery.isRevealed()).to.equal(false);
    });

    it("should not be claimed initially", async function () {
      expect(await lottery.isClaimed()).to.equal(false);
    });
  });

  describe("Entering Lottery", function () {
    it("should allow entry with ERC7984 payment", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await lottery.getAddress(), player1.address)
        .add64(TICKET_PRICE)
        .encrypt();

      await expect(
        lottery.connect(player1).enter(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      )
        .to.emit(lottery, "LotteryEntered")
        .withArgs(player1.address, 0);

      expect(await lottery.getParticipantCount()).to.equal(1);
      expect(await lottery.hasEntered(player1.address)).to.equal(true);
    });

    it("should reject double entry", async function () {
      const input1 = await fhevm
        .createEncryptedInput(await lottery.getAddress(), player1.address)
        .add64(TICKET_PRICE)
        .encrypt();

      await lottery.connect(player1).enter(input1.handles[0], input1.inputProof);

      const input2 = await fhevm
        .createEncryptedInput(await lottery.getAddress(), player1.address)
        .add64(TICKET_PRICE)
        .encrypt();

      await expect(
        lottery.connect(player1).enter(input2.handles[0], input2.inputProof)
      ).to.be.revertedWithCustomError(lottery, "AlreadyEntered");
    });

    it("should accept multiple unique participants", async function () {
      for (const player of [player1, player2, player3]) {
        const encryptedInput = await fhevm
          .createEncryptedInput(await lottery.getAddress(), player.address)
          .add64(TICKET_PRICE)
          .encrypt();

        await lottery.connect(player).enter(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );
      }

      expect(await lottery.getParticipantCount()).to.equal(3);
    });

    it("should track participants correctly", async function () {
      const input1 = await fhevm
        .createEncryptedInput(await lottery.getAddress(), player1.address)
        .add64(TICKET_PRICE)
        .encrypt();
      await lottery.connect(player1).enter(input1.handles[0], input1.inputProof);

      const input2 = await fhevm
        .createEncryptedInput(await lottery.getAddress(), player2.address)
        .add64(TICKET_PRICE)
        .encrypt();
      await lottery.connect(player2).enter(input2.handles[0], input2.inputProof);

      expect(await lottery.getParticipant(0)).to.equal(player1.address);
      expect(await lottery.getParticipant(1)).to.equal(player2.address);
    });

    it("should reject entry after lottery ends", async function () {
      await time.increase(DURATION + 1);

      const encryptedInput = await fhevm
        .createEncryptedInput(await lottery.getAddress(), player1.address)
        .add64(TICKET_PRICE)
        .encrypt();

      await expect(
        lottery.connect(player1).enter(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(lottery, "LotteryAlreadyDrawn");
    });
  });

  describe("Drawing Winner", function () {
    beforeEach(async function () {
      // Enter players
      for (const player of [player1, player2]) {
        const encryptedInput = await fhevm
          .createEncryptedInput(await lottery.getAddress(), player.address)
          .add64(TICKET_PRICE)
          .encrypt();
        await lottery.connect(player).enter(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );
      }
    });

    it("should draw winner with enough participants", async function () {
      await expect(lottery.connect(owner).draw())
        .to.emit(lottery, "WinnerDrawn")
        .withArgs(2);

      expect(await lottery.isDrawn()).to.equal(true);
    });

    it("should reject draw with insufficient participants", async function () {
      // Deploy new lottery
      const LotteryFactory = await ethers.getContractFactory("LotteryERC7984");
      const newLottery = await LotteryFactory.deploy(
        await token.getAddress(),
        TICKET_PRICE,
        DURATION
      );

      // Only one participant (use blockchain time for operator)
      const blockTime = await time.latest();
      await token.connect(player3).setOperator(await newLottery.getAddress(), blockTime + 10000);
      const input = await fhevm
        .createEncryptedInput(await newLottery.getAddress(), player3.address)
        .add64(TICKET_PRICE)
        .encrypt();
      await newLottery.connect(player3).enter(input.handles[0], input.inputProof);

      await expect(newLottery.connect(owner).draw())
        .to.be.revertedWithCustomError(newLottery, "NotEnoughParticipants");
    });

    it("should reject double draw", async function () {
      await lottery.connect(owner).draw();

      await expect(lottery.connect(owner).draw())
        .to.be.revertedWithCustomError(lottery, "LotteryAlreadyDrawn");
    });

    it("should reject entry after draw", async function () {
      await lottery.connect(owner).draw();

      const encryptedInput = await fhevm
        .createEncryptedInput(await lottery.getAddress(), player3.address)
        .add64(TICKET_PRICE)
        .encrypt();

      await expect(
        lottery.connect(player3).enter(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(lottery, "LotteryAlreadyDrawn");
    });
  });

  describe("Winner Reveal", function () {
    beforeEach(async function () {
      for (const player of [player1, player2]) {
        const encryptedInput = await fhevm
          .createEncryptedInput(await lottery.getAddress(), player.address)
          .add64(TICKET_PRICE)
          .encrypt();
        await lottery.connect(player).enter(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );
      }
      await lottery.connect(owner).draw();
    });

    it("should emit WinnerReadyForReveal on requestWinnerReveal", async function () {
      await expect(lottery.requestWinnerReveal())
        .to.emit(lottery, "WinnerReadyForReveal");
    });

    it("should reject requestWinnerReveal before draw", async function () {
      const LotteryFactory = await ethers.getContractFactory("LotteryERC7984");
      const newLottery = await LotteryFactory.deploy(
        await token.getAddress(),
        TICKET_PRICE,
        DURATION
      );

      await expect(newLottery.requestWinnerReveal())
        .to.be.revertedWithCustomError(newLottery, "LotteryNotDrawn");
    });

    it("should have encrypted prize pool after entries", async function () {
      const prizePool = await lottery.getEncryptedPrizePool();
      expect(prizePool).to.not.equal(0n);
    });
  });

  describe("Prize Claiming", function () {
    it("should reject claim before reveal", async function () {
      for (const player of [player1, player2]) {
        const encryptedInput = await fhevm
          .createEncryptedInput(await lottery.getAddress(), player.address)
          .add64(TICKET_PRICE)
          .encrypt();
        await lottery.connect(player).enter(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );
      }
      await lottery.connect(owner).draw();

      await expect(lottery.connect(player1).claimPrize())
        .to.be.revertedWithCustomError(lottery, "WinnerNotRevealed");
    });

    it("should reject getWinner before reveal", async function () {
      for (const player of [player1, player2]) {
        const encryptedInput = await fhevm
          .createEncryptedInput(await lottery.getAddress(), player.address)
          .add64(TICKET_PRICE)
          .encrypt();
        await lottery.connect(player).enter(
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );
      }
      await lottery.connect(owner).draw();

      await expect(lottery.getWinner())
        .to.be.revertedWithCustomError(lottery, "WinnerNotRevealed");
    });
  });

  describe("View Functions", function () {
    it("should return correct participant at index", async function () {
      const input = await fhevm
        .createEncryptedInput(await lottery.getAddress(), player1.address)
        .add64(TICKET_PRICE)
        .encrypt();
      await lottery.connect(player1).enter(input.handles[0], input.inputProof);

      expect(await lottery.getParticipant(0)).to.equal(player1.address);
    });

    it("should reject out of bounds participant index", async function () {
      await expect(lottery.getParticipant(99))
        .to.be.revertedWith("Index out of bounds");
    });
  });
});
