import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { AMMERC7984, ERC7984Example } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers" 

describe("AMMERC7984", function () {
  let amm: AMMERC7984;
  let tokenA: ERC7984Example;
  let tokenB: ERC7984Example;
  let owner: HardhatEthersSigner;
  let lp: HardhatEthersSigner;
  let trader: HardhatEthersSigner;

  const LIQUIDITY_A = 1000n;
  const LIQUIDITY_B = 2000n;
  const SWAP_AMOUNT = 100n;

  beforeEach(async function () {
    [owner, lp, trader] = await ethers.getSigners();

    // Deploy tokens
    const TokenFactory = await ethers.getContractFactory("ERC7984Example");

    tokenA = await TokenFactory.deploy(
      owner.address,
      100000n,
      "Token A",
      "TKNA",
      "https://example.com/tokenA"
    );
    await tokenA.waitForDeployment();

    tokenB = await TokenFactory.deploy(
      owner.address,
      100000n,
      "Token B",
      "TKNB",
      "https://example.com/tokenB"
    );
    await tokenB.waitForDeployment();

    // Distribute tokens
    await tokenA.mint(lp.address, 10000n);
    await tokenB.mint(lp.address, 10000n);
    await tokenA.mint(trader.address, 5000n);
    await tokenB.mint(trader.address, 5000n);

    // Deploy AMM
    const AMMFactory = await ethers.getContractFactory("AMMERC7984");
    amm = await AMMFactory.deploy();
    await amm.waitForDeployment();

    // Set AMM as operator (use blockchain time)
    const currentTime = await time.latest();
    const futureTime = currentTime + 86400;
    for (const user of [lp, trader]) {
      await tokenA.connect(user).setOperator(await amm.getAddress(), futureTime);
      await tokenB.connect(user).setOperator(await amm.getAddress(), futureTime);
    }
  });

  describe("Pool Creation", function () {
    it("should create a pool", async function () {
      await expect(
        amm.connect(owner).createPool(
          await tokenA.getAddress(),
          await tokenB.getAddress()
        )
      )
        .to.emit(amm, "PoolCreated")
        .withArgs(await tokenA.getAddress(), await tokenB.getAddress());
    });

    it("should increment pool counter", async function () {
      await amm.connect(owner).createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      expect(await amm.getPoolCount()).to.equal(1);
    });

    it("should reject same token pair", async function () {
      await expect(
        amm.connect(owner).createPool(
          await tokenA.getAddress(),
          await tokenA.getAddress()
        )
      ).to.be.revertedWith("Same token");
    });

    it("should store pool info correctly", async function () {
      await amm.connect(owner).createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      const pool = await amm.getPool(0);
      expect(pool.token0).to.equal(await tokenA.getAddress());
      expect(pool.token1).to.equal(await tokenB.getAddress());
      expect(pool.initialized).to.equal(true);
    });

    it("should allow pool lookup by token pair", async function () {
      await amm.connect(owner).createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      const poolId = await amm.getPoolId(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      expect(poolId).to.equal(0);

      // Should work in reverse order too
      const poolIdReverse = await amm.getPoolId(
        await tokenB.getAddress(),
        await tokenA.getAddress()
      );
      expect(poolIdReverse).to.equal(0);
    });
  });

  describe("Liquidity", function () {
    let poolId: number;

    beforeEach(async function () {
      await amm.connect(owner).createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      poolId = 0;
    });

    it("should add liquidity", async function () {
      const inputA = await fhevm
        .createEncryptedInput(await amm.getAddress(), lp.address)
        .add64(LIQUIDITY_A)
        .encrypt();

      const inputB = await fhevm
        .createEncryptedInput(await amm.getAddress(), lp.address)
        .add64(LIQUIDITY_B)
        .encrypt();

      await expect(
        amm.connect(lp).addLiquidity(
          poolId,
          inputA.handles[0],
          inputB.handles[0],
          inputA.inputProof,
          inputB.inputProof
        )
      )
        .to.emit(amm, "LiquidityAdded");
    });

    it("should track LP shares", async function () {
      const inputA = await fhevm
        .createEncryptedInput(await amm.getAddress(), lp.address)
        .add64(LIQUIDITY_A)
        .encrypt();

      const inputB = await fhevm
        .createEncryptedInput(await amm.getAddress(), lp.address)
        .add64(LIQUIDITY_B)
        .encrypt();

      await amm.connect(lp).addLiquidity(
        poolId,
        inputA.handles[0],
        inputB.handles[0],
        inputA.inputProof,
        inputB.inputProof
      );

      const shares = await amm.getLpShares(poolId, lp.address);
      expect(shares).to.not.equal(0n);
    });

    it("should track reserves", async function () {
      const inputA = await fhevm
        .createEncryptedInput(await amm.getAddress(), lp.address)
        .add64(LIQUIDITY_A)
        .encrypt();

      const inputB = await fhevm
        .createEncryptedInput(await amm.getAddress(), lp.address)
        .add64(LIQUIDITY_B)
        .encrypt();

      await amm.connect(lp).addLiquidity(
        poolId,
        inputA.handles[0],
        inputB.handles[0],
        inputA.inputProof,
        inputB.inputProof
      );

      const [reserve0, reserve1] = await amm.getReserves(poolId);
      expect(reserve0).to.not.equal(0n);
      expect(reserve1).to.not.equal(0n);
    });
  });

  describe("Swapping", function () {
    let poolId: number;

    beforeEach(async function () {
      await amm.connect(owner).createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      poolId = 0;

      // Add initial liquidity
      const inputA = await fhevm
        .createEncryptedInput(await amm.getAddress(), lp.address)
        .add64(5000n)
        .encrypt();

      const inputB = await fhevm
        .createEncryptedInput(await amm.getAddress(), lp.address)
        .add64(5000n)
        .encrypt();

      await amm.connect(lp).addLiquidity(
        poolId,
        inputA.handles[0],
        inputB.handles[0],
        inputA.inputProof,
        inputB.inputProof
      );
    });

    it("should swap token A for token B", async function () {
      const inputAmount = await fhevm
        .createEncryptedInput(await amm.getAddress(), trader.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        amm.connect(trader).swap(
          poolId,
          await tokenA.getAddress(),
          inputAmount.handles[0],
          inputAmount.inputProof
        )
      )
        .to.emit(amm, "Swap")
        .withArgs(trader.address, await tokenA.getAddress(), await tokenB.getAddress());
    });

    it("should swap token B for token A", async function () {
      const inputAmount = await fhevm
        .createEncryptedInput(await amm.getAddress(), trader.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        amm.connect(trader).swap(
          poolId,
          await tokenB.getAddress(),
          inputAmount.handles[0],
          inputAmount.inputProof
        )
      )
        .to.emit(amm, "Swap")
        .withArgs(trader.address, await tokenB.getAddress(), await tokenA.getAddress());
    });

    it("should reject swap with invalid token", async function () {
      // Deploy a third token not in the pool
      const TokenFactory = await ethers.getContractFactory("ERC7984Example");
      const tokenC = await TokenFactory.deploy(
        owner.address,
        1000n,
        "Token C",
        "TKNC",
        "https://example.com/tokenC"
      );

      const inputAmount = await fhevm
        .createEncryptedInput(await amm.getAddress(), trader.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        amm.connect(trader).swap(
          poolId,
          await tokenC.getAddress(),
          inputAmount.handles[0],
          inputAmount.inputProof
        )
      ).to.be.revertedWithCustomError(amm, "InvalidToken");
    });
  });

  describe("View Functions", function () {
    it("should return correct pool count", async function () {
      expect(await amm.getPoolCount()).to.equal(0);

      await amm.connect(owner).createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );

      expect(await amm.getPoolCount()).to.equal(1);
    });
  });
});
