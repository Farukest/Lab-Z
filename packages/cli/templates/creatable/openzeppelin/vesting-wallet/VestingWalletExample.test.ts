import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { VestingWalletExample, ERC7984Example } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("VestingWalletExample", function () {
  let vestingWallet: VestingWalletExample;
  let token: ERC7984Example;
  let owner: HardhatEthersSigner;
  let beneficiary: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const VESTING_AMOUNT = 1000n;
  const VESTING_DURATION = 3600; // 1 hour in seconds

  let startTime: number;

  beforeEach(async function () {
    [owner, beneficiary, other] = await ethers.getSigners();

    // Deploy ERC7984 token
    const TokenFactory = await ethers.getContractFactory("ERC7984Example");
    token = await TokenFactory.deploy(
      owner.address,
      VESTING_AMOUNT,
      "Vesting Token",
      "VEST",
      "https://example.com/vesting"
    );
    await token.waitForDeployment();

    // Get current time and set vesting to start in 60 seconds
    const currentTime = await time.latest();
    startTime = currentTime + 60;

    // Deploy vesting wallet
    const VestingFactory = await ethers.getContractFactory("VestingWalletExample");
    vestingWallet = await VestingFactory.deploy(
      beneficiary.address,
      startTime,
      VESTING_DURATION
    );
    await vestingWallet.waitForDeployment();

    // Transfer tokens to vesting wallet
    const encryptedInput = await fhevm
      .createEncryptedInput(await token.getAddress(), owner.address)
      .add64(VESTING_AMOUNT)
      .encrypt();

    await token
      .connect(owner)
      ["confidentialTransfer(address,bytes32,bytes)"](
        await vestingWallet.getAddress(),
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
  });

  describe("Deployment", function () {
    it("should set the correct beneficiary", async function () {
      expect(await vestingWallet.beneficiary()).to.equal(beneficiary.address);
    });

    it("should set the correct start time", async function () {
      expect(await vestingWallet.start()).to.equal(startTime);
    });

    it("should set the correct duration", async function () {
      expect(await vestingWallet.duration()).to.equal(VESTING_DURATION);
    });

    it("should calculate correct end time", async function () {
      expect(await vestingWallet.end()).to.equal(startTime + VESTING_DURATION);
    });

    it("should show vesting not started initially", async function () {
      expect(await vestingWallet.hasStarted()).to.equal(false);
    });

    it("should show vesting not ended initially", async function () {
      expect(await vestingWallet.hasEnded()).to.equal(false);
    });

    it("should show 0% progress initially", async function () {
      expect(await vestingWallet.vestingProgress()).to.equal(0);
    });
  });

  describe("Vesting Schedule", function () {
    it("should not release tokens before vesting starts", async function () {
      await expect(vestingWallet.release(await token.getAddress()))
        .to.be.revertedWithCustomError(vestingWallet, "VestingNotStarted");
    });

    it("should release tokens after vesting starts", async function () {
      // Move time to after start
      await time.increaseTo(startTime + 1);

      expect(await vestingWallet.hasStarted()).to.equal(true);

      await expect(vestingWallet.release(await token.getAddress()))
        .to.emit(vestingWallet, "TokensReleased");
    });

    it("should release proportional tokens at midpoint", async function () {
      // Move to midpoint
      const midpoint = startTime + (VESTING_DURATION / 2);
      await time.increaseTo(midpoint);

      const progress = await vestingWallet.vestingProgress();
      expect(progress).to.be.closeTo(50, 2); // ~50% with some tolerance

      await expect(vestingWallet.release(await token.getAddress()))
        .to.not.be.reverted;
    });

    it("should release all tokens after vesting ends", async function () {
      // Move past end
      const endTime = startTime + VESTING_DURATION + 100;
      await time.increaseTo(endTime);

      expect(await vestingWallet.hasEnded()).to.equal(true);
      expect(await vestingWallet.vestingProgress()).to.equal(100);

      await expect(vestingWallet.release(await token.getAddress()))
        .to.not.be.reverted;
    });

    it("should allow multiple releases over time", async function () {
      // First release at 25%
      await time.increaseTo(startTime + (VESTING_DURATION / 4));
      await vestingWallet.release(await token.getAddress());

      // Second release at 75%
      await time.increaseTo(startTime + (3 * VESTING_DURATION / 4));
      await vestingWallet.release(await token.getAddress());

      // Final release at 100%
      await time.increaseTo(startTime + VESTING_DURATION + 1);
      await vestingWallet.release(await token.getAddress());
    });
  });

  describe("Access Control", function () {
    it("should only allow owner (beneficiary) to transfer ownership", async function () {
      await expect(vestingWallet.connect(beneficiary).transferOwnership(other.address))
        .to.not.be.reverted;
    });

    it("should reject ownership transfer from non-owner", async function () {
      await expect(vestingWallet.connect(other).transferOwnership(other.address))
        .to.be.revertedWithCustomError(vestingWallet, "OwnableUnauthorizedAccount");
    });
  });

  describe("Released Tracking", function () {
    it("should track released amount", async function () {
      await time.increaseTo(startTime + VESTING_DURATION + 1);
      await vestingWallet.release(await token.getAddress());

      const released = await vestingWallet.released(await token.getAddress());
      expect(released).to.not.equal(0n);
    });
  });

  describe("Multiple Tokens", function () {
    let token2: ERC7984Example;

    beforeEach(async function () {
      // Deploy second token
      const TokenFactory = await ethers.getContractFactory("ERC7984Example");
      token2 = await TokenFactory.deploy(
        owner.address,
        500n,
        "Second Token",
        "TK2",
        "https://example.com/token2"
      );
      await token2.waitForDeployment();

      // Transfer to vesting wallet
      const encryptedInput = await fhevm
        .createEncryptedInput(await token2.getAddress(), owner.address)
        .add64(500n)
        .encrypt();

      await token2
        .connect(owner)
        ["confidentialTransfer(address,bytes32,bytes)"](
          await vestingWallet.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );
    });

    it("should vest multiple tokens independently", async function () {
      await time.increaseTo(startTime + VESTING_DURATION + 1);

      await expect(vestingWallet.release(await token.getAddress()))
        .to.emit(vestingWallet, "TokensReleased");

      await expect(vestingWallet.release(await token2.getAddress()))
        .to.emit(vestingWallet, "TokensReleased");
    });
  });
});
