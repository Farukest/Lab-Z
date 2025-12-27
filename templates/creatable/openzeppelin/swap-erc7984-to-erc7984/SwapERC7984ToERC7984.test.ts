import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { SwapERC7984ToERC7984, ERC7984Example } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SwapERC7984ToERC7984", function () {
  let swap: SwapERC7984ToERC7984;
  let tokenA: ERC7984Example;
  let tokenB: ERC7984Example;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const INITIAL_BALANCE = 1000n;
  const SWAP_AMOUNT = 100n;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Token A
    const TokenFactory = await ethers.getContractFactory("ERC7984Example");
    tokenA = await TokenFactory.deploy(
      owner.address,
      10000n,
      "Token A",
      "TKNA",
      "https://example.com/tokenA"
    );
    await tokenA.waitForDeployment();

    // Deploy Token B
    tokenB = await TokenFactory.deploy(
      owner.address,
      10000n,
      "Token B",
      "TKNB",
      "https://example.com/tokenB"
    );
    await tokenB.waitForDeployment();

    // Give tokens to users
    await tokenA.mint(user1.address, INITIAL_BALANCE);
    await tokenB.mint(user1.address, INITIAL_BALANCE);
    await tokenB.mint(user2.address, INITIAL_BALANCE);

    // Deploy swap contract
    const SwapFactory = await ethers.getContractFactory("SwapERC7984ToERC7984");
    swap = await SwapFactory.deploy();
    await swap.waitForDeployment();

    // Set swap contract as operator (use blockchain time, not Date.now())
    const currentTime = await time.latest();
    const futureTime = currentTime + 86400;
    await tokenA.connect(user1).setOperator(await swap.getAddress(), futureTime);
    await tokenB.connect(user1).setOperator(await swap.getAddress(), futureTime);
    await tokenB.connect(user2).setOperator(await swap.getAddress(), futureTime);
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(await swap.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Swap Confidential for Confidential (1:1)", function () {
    beforeEach(async function () {
      // Add liquidity (swap contract needs Token B to give out)
      await tokenB.mint(await swap.getAddress(), 5000n);
    });

    it("should swap tokens 1:1", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        swap.connect(user1).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      )
        .to.emit(swap, "ConfidentialSwap")
        .withArgs(user1.address, await tokenA.getAddress(), await tokenB.getAddress());
    });

    it("should reject swap from non-operator", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user2.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        swap.connect(user2).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(swap, "NotOperator");
    });
  });

  describe("Swap with Rate", function () {
    beforeEach(async function () {
      await tokenB.mint(await swap.getAddress(), 10000n);
    });

    it("should swap with 2:1 rate", async function () {
      const rate = 2000000n; // 2:1 (2 * 1e6)

      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        swap.connect(user1).swapWithRate(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          rate
        )
      )
        .to.emit(swap, "ConfidentialSwap");
    });

    it("should swap with 0.5:1 rate", async function () {
      const rate = 500000n; // 0.5:1 (0.5 * 1e6)

      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        swap.connect(user1).swapWithRate(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          rate
        )
      ).to.not.be.reverted;
    });
  });

  describe("Liquidity", function () {
    it("should add liquidity", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(500n)
        .encrypt();

      await expect(
        swap.connect(user1).addLiquidity(
          await tokenB.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      )
        .to.emit(swap, "LiquidityAdded")
        .withArgs(await tokenB.getAddress(), user1.address);
    });

    it("should track pool balance", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(500n)
        .encrypt();

      await swap.connect(user1).addLiquidity(
        await tokenB.getAddress(),
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      const poolBalance = await swap.getPoolBalance(await tokenB.getAddress());
      expect(poolBalance).to.not.equal(0n);
    });
  });
});
