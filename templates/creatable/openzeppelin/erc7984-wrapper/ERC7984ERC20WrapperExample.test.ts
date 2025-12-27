import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { ERC7984ERC20WrapperExample, MockERC20 } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC7984ERC20WrapperExample", function () {
  let wrapper: ERC7984ERC20WrapperExample;
  let underlyingToken: MockERC20;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  // Note: ERC7984 wrapper uses rate to convert decimals (18 -> 6)
  // With 18 decimal token, rate = 10^12, so we need larger balances
  const INITIAL_BALANCE = 10000n * 10n ** 18n; // 10000 tokens with 18 decimals
  const WRAP_AMOUNT = 1000n; // Wrapped tokens (6 decimals)

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy underlying ERC20 token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    underlyingToken = await ERC20Factory.deploy("Underlying Token", "UND");
    await underlyingToken.waitForDeployment();

    // Distribute tokens
    await underlyingToken.mint(user1.address, INITIAL_BALANCE);
    await underlyingToken.mint(user2.address, INITIAL_BALANCE);

    // Deploy wrapper
    const WrapperFactory = await ethers.getContractFactory("ERC7984ERC20WrapperExample");
    wrapper = await WrapperFactory.deploy(
      await underlyingToken.getAddress(),
      "Wrapped Confidential Token",
      "wCONF",
      "https://example.com/wrapper"
    );
    await wrapper.waitForDeployment();

    // Approve wrapper for users
    await underlyingToken.connect(user1).approve(await wrapper.getAddress(), INITIAL_BALANCE);
    await underlyingToken.connect(user2).approve(await wrapper.getAddress(), INITIAL_BALANCE);

    // Set wrapper as operator for unwrapping (ERC7984 requires operator approval)
    const currentTime = await time.latest();
    const futureTime = currentTime + 86400;
    await wrapper.connect(user1).setOperator(await wrapper.getAddress(), futureTime);
    await wrapper.connect(user2).setOperator(await wrapper.getAddress(), futureTime);
  });

  describe("Deployment", function () {
    it("should set correct name", async function () {
      expect(await wrapper.name()).to.equal("Wrapped Confidential Token");
    });

    it("should set correct symbol", async function () {
      expect(await wrapper.symbol()).to.equal("wCONF");
    });

    it("should reference correct underlying token", async function () {
      expect(await wrapper.underlying()).to.equal(await underlyingToken.getAddress());
    });

    it("should start with zero deposited", async function () {
      expect(await wrapper.totalDeposited()).to.equal(0);
    });

    it("should have rate of 10^12 for 18 decimal token", async function () {
      // Since underlying has 18 decimals and max is 6, rate = 10^12
      const rate = await wrapper.rate();
      expect(rate).to.equal(10n ** 12n);
    });

    it("should have 6 decimals (max for ERC7984)", async function () {
      expect(await wrapper.decimals()).to.equal(6);
    });
  });

  describe("Wrapping (Deposit)", function () {
    it("should wrap ERC20 to ERC7984", async function () {
      // Wrap amount needs to be adjusted for rate (10^12)
      const rate = await wrapper.rate();
      const wrapAmountAdjusted = WRAP_AMOUNT * rate;

      await wrapper.connect(user1).wrap(user1.address, wrapAmountAdjusted);

      // Underlying balance decreased
      expect(await underlyingToken.balanceOf(user1.address)).to.equal(INITIAL_BALANCE - wrapAmountAdjusted);

      // Wrapper received the tokens
      expect(await underlyingToken.balanceOf(await wrapper.getAddress())).to.equal(wrapAmountAdjusted);

      // Total deposited increased
      expect(await wrapper.totalDeposited()).to.equal(wrapAmountAdjusted);
    });

    it("should allow wrap for another user", async function () {
      const rate = await wrapper.rate();
      const wrapAmountAdjusted = WRAP_AMOUNT * rate;

      await wrapper.connect(user1).wrap(user2.address, wrapAmountAdjusted);

      // user1's underlying decreased
      expect(await underlyingToken.balanceOf(user1.address)).to.equal(INITIAL_BALANCE - wrapAmountAdjusted);

      // Total deposited increased
      expect(await wrapper.totalDeposited()).to.equal(wrapAmountAdjusted);
    });

    it("should reject wrap without approval", async function () {
      // Revoke approval
      await underlyingToken.connect(user1).approve(await wrapper.getAddress(), 0);

      const rate = await wrapper.rate();
      const wrapAmountAdjusted = WRAP_AMOUNT * rate;

      await expect(wrapper.connect(user1).wrap(user1.address, wrapAmountAdjusted))
        .to.be.reverted;
    });

    it("should reject wrap exceeding balance", async function () {
      const rate = await wrapper.rate();
      const exceedAmount = (INITIAL_BALANCE + 1n) * rate;

      await underlyingToken.connect(user1).approve(await wrapper.getAddress(), exceedAmount);

      await expect(wrapper.connect(user1).wrap(user1.address, exceedAmount))
        .to.be.reverted;
    });

    it("should allow multiple wraps", async function () {
      const rate = await wrapper.rate();
      const wrapAmountAdjusted = WRAP_AMOUNT * rate;

      await wrapper.connect(user1).wrap(user1.address, wrapAmountAdjusted);
      await wrapper.connect(user1).wrap(user1.address, wrapAmountAdjusted);

      expect(await wrapper.totalDeposited()).to.equal(wrapAmountAdjusted * 2n);
    });

    it("should round down amount not divisible by rate", async function () {
      const rate = await wrapper.rate();
      // Wrap amount that's not perfectly divisible
      const oddAmount = WRAP_AMOUNT * rate + 123n;

      await wrapper.connect(user1).wrap(user1.address, oddAmount);

      // Should get WRAP_AMOUNT * rate deposited (remainder excluded)
      expect(await wrapper.totalDeposited()).to.equal(WRAP_AMOUNT * rate);
    });
  });

  describe("Unwrapping (Withdraw)", function () {
    beforeEach(async function () {
      // First wrap some tokens
      const rate = await wrapper.rate();
      await wrapper.connect(user1).wrap(user1.address, WRAP_AMOUNT * rate);
    });

    it("should request unwrap with encrypted amount", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), user1.address)
        .add64(WRAP_AMOUNT / 2n)
        .encrypt();

      await expect(
        wrapper.connect(user1)["unwrap(address,address,bytes32,bytes)"](
          user1.address,
          user1.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      )
        .to.emit(wrapper, "UnwrapRequested");
    });

    it("should allow unwrap to another address", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), user1.address)
        .add64(WRAP_AMOUNT / 2n)
        .encrypt();

      await expect(
        wrapper.connect(user1)["unwrap(address,address,bytes32,bytes)"](
          user1.address,
          user2.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      )
        .to.emit(wrapper, "UnwrapRequested");
    });

    it("should reject unwrap to zero address", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), user1.address)
        .add64(WRAP_AMOUNT / 2n)
        .encrypt();

      await expect(
        wrapper.connect(user1)["unwrap(address,address,bytes32,bytes)"](
          user1.address,
          ethers.ZeroAddress,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(wrapper, "ERC7984InvalidReceiver");
    });

    it("should reject unwrap from unauthorized account", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), user2.address)
        .add64(WRAP_AMOUNT / 2n)
        .encrypt();

      // user2 trying to unwrap user1's tokens without being operator
      await expect(
        wrapper.connect(user2)["unwrap(address,address,bytes32,bytes)"](
          user1.address,
          user2.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(wrapper, "ERC7984UnauthorizedSpender");
    });
  });

  describe("Confidential Balance", function () {
    beforeEach(async function () {
      const rate = await wrapper.rate();
      await wrapper.connect(user1).wrap(user1.address, WRAP_AMOUNT * rate);
    });

    it("should have encrypted balance after wrap", async function () {
      const encBalance = await wrapper.confidentialBalanceOf(user1.address);
      expect(encBalance).to.not.equal(0n);
    });

    it("should allow confidential transfer", async function () {
      // Set user2 as operator for receiving (use blockchain time)
      const blockTime = await time.latest();
      const futureTime = blockTime + 86400;
      await wrapper.connect(user1).setOperator(user2.address, futureTime);

      const encryptedInput = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), user1.address)
        .add64(100n)
        .encrypt();

      // Use explicit function signature for overloaded method
      await expect(
        wrapper.connect(user1)["confidentialTransfer(address,bytes32,bytes)"](
          user2.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.not.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("should return underlying address", async function () {
      expect(await wrapper.underlying()).to.equal(await underlyingToken.getAddress());
    });

    it("should track total deposited correctly", async function () {
      expect(await wrapper.totalDeposited()).to.equal(0);

      const rate = await wrapper.rate();
      await wrapper.connect(user1).wrap(user1.address, WRAP_AMOUNT * rate);
      expect(await wrapper.totalDeposited()).to.equal(WRAP_AMOUNT * rate);

      await wrapper.connect(user2).wrap(user2.address, WRAP_AMOUNT * rate);
      expect(await wrapper.totalDeposited()).to.equal(WRAP_AMOUNT * 2n * rate);
    });

    it("should return rate", async function () {
      const rate = await wrapper.rate();
      expect(rate).to.be.gt(0n);
    });
  });

  describe("Edge Cases", function () {
    it("should handle very large wraps", async function () {
      const rate = await wrapper.rate();
      const largeAmount = 9000n; // Less than initial balance in wrapped units

      await expect(wrapper.connect(user1).wrap(user1.address, largeAmount * rate))
        .to.not.be.reverted;

      expect(await wrapper.totalDeposited()).to.equal(largeAmount * rate);
    });

    it("should maintain correct ratio between wrapped and underlying", async function () {
      const rate = await wrapper.rate();
      await wrapper.connect(user1).wrap(user1.address, WRAP_AMOUNT * rate);
      await wrapper.connect(user2).wrap(user2.address, WRAP_AMOUNT * 2n * rate);

      const totalDeposited = await wrapper.totalDeposited();
      const heldUnderlying = await underlyingToken.balanceOf(await wrapper.getAddress());

      // Total deposited should equal held underlying
      expect(totalDeposited).to.equal(heldUnderlying);
    });

    it("should have encrypted total supply", async function () {
      const rate = await wrapper.rate();
      await wrapper.connect(user1).wrap(user1.address, WRAP_AMOUNT * rate);

      const encTotalSupply = await wrapper.confidentialTotalSupply();
      expect(encTotalSupply).to.not.equal(0n);
    });
  });
});
