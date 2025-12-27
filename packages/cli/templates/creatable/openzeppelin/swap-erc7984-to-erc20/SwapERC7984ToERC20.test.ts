import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { SwapERC7984ToERC20, ERC7984Example, MockERC20 } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("SwapERC7984ToERC20", function () {
  let swap: SwapERC7984ToERC20;
  let confidentialToken: ERC7984Example;
  let publicToken: MockERC20;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const INITIAL_BALANCE = 1000n;
  const SWAP_AMOUNT = 100n;
  const RATE = 1000000n; // 1:1 rate (1e6 precision)

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy confidential token (ERC7984)
    const ConfidentialFactory = await ethers.getContractFactory("ERC7984Example");
    confidentialToken = await ConfidentialFactory.deploy(
      owner.address,
      10000n,
      "Confidential Token",
      "CONF",
      "https://example.com/conf"
    );
    await confidentialToken.waitForDeployment();

    // Deploy public token (ERC20)
    const PublicFactory = await ethers.getContractFactory("MockERC20");
    publicToken = await PublicFactory.deploy("Public Token", "PUB");
    await publicToken.waitForDeployment();

    // Distribute tokens
    await confidentialToken.mint(user1.address, INITIAL_BALANCE);
    await publicToken.mint(user1.address, INITIAL_BALANCE);
    await publicToken.mint(user2.address, INITIAL_BALANCE);

    // Deploy swap contract
    const SwapFactory = await ethers.getContractFactory("SwapERC7984ToERC20");
    swap = await SwapFactory.deploy();
    await swap.waitForDeployment();

    // Provide liquidity to swap contract
    await publicToken.mint(await swap.getAddress(), 5000n);

    // Set swap as operator for confidential token (use blockchain time)
    const currentTime = await time.latest();
    const futureTime = currentTime + 86400;
    await confidentialToken.connect(user1).setOperator(await swap.getAddress(), futureTime);
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(await swap.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Initiate Swap (Confidential to Public)", function () {
    it("should initiate a swap request", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        swap.connect(user1).initiateSwap(
          await confidentialToken.getAddress(),
          await publicToken.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          RATE
        )
      )
        .to.emit(swap, "SwapInitiated")
        .withArgs(0, user1.address, await confidentialToken.getAddress(), await publicToken.getAddress());
    });

    it("should increment swap counter", async function () {
      const input1 = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await swap.connect(user1).initiateSwap(
        await confidentialToken.getAddress(),
        await publicToken.getAddress(),
        input1.handles[0],
        input1.inputProof,
        RATE
      );

      expect(await swap.getSwapCount()).to.equal(1);

      const input2 = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await swap.connect(user1).initiateSwap(
        await confidentialToken.getAddress(),
        await publicToken.getAddress(),
        input2.handles[0],
        input2.inputProof,
        RATE
      );

      expect(await swap.getSwapCount()).to.equal(2);
    });

    it("should store swap info correctly", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await swap.connect(user1).initiateSwap(
        await confidentialToken.getAddress(),
        await publicToken.getAddress(),
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        RATE
      );

      const swapInfo = await swap.getSwap(0);
      expect(swapInfo.user).to.equal(user1.address);
      expect(swapInfo.confidentialToken).to.equal(await confidentialToken.getAddress());
      expect(swapInfo.publicToken).to.equal(await publicToken.getAddress());
      expect(swapInfo.rate).to.equal(RATE);
      expect(swapInfo.completed).to.equal(false);
    });
  });

  describe("Complete Swap", function () {
    let swapId: number;

    beforeEach(async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await swap.connect(user1).initiateSwap(
        await confidentialToken.getAddress(),
        await publicToken.getAddress(),
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        RATE
      );
      swapId = 0;
    });

    it("should request decryption", async function () {
      await expect(swap.requestDecryption(swapId))
        .to.emit(swap, "DecryptionRequested")
        .withArgs(swapId);
    });

    it("should reject request for non-existent swap", async function () {
      await expect(swap.requestDecryption(99))
        .to.be.revertedWithCustomError(swap, "SwapNotFound");
    });

    it("should reject double request", async function () {
      await swap.requestDecryption(swapId);

      await expect(swap.requestDecryption(swapId))
        .to.be.revertedWithCustomError(swap, "DecryptionAlreadyRequested");
    });
  });

  describe("Cancel Swap", function () {
    let swapId: number;

    beforeEach(async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await swap.connect(user1).initiateSwap(
        await confidentialToken.getAddress(),
        await publicToken.getAddress(),
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        RATE
      );
      swapId = 0;
    });

    it("should allow user to cancel their swap", async function () {
      await expect(swap.connect(user1).cancelSwap(swapId))
        .to.emit(swap, "SwapCancelled")
        .withArgs(swapId);

      const swapInfo = await swap.getSwap(swapId);
      expect(swapInfo.cancelled).to.equal(true);
    });

    it("should reject cancel from non-owner", async function () {
      await expect(swap.connect(user2).cancelSwap(swapId))
        .to.be.revertedWithCustomError(swap, "NotSwapOwner");
    });

    it("should reject cancel of completed swap", async function () {
      // Complete the swap first (simulated)
      await swap.requestDecryption(swapId);
      // In real scenario, gateway callback would complete it

      // For now, just test that we can't cancel after decryption requested
      await expect(swap.connect(user1).cancelSwap(swapId))
        .to.be.revertedWithCustomError(swap, "SwapAlreadyProcessing");
    });
  });

  describe("Rate Variations", function () {
    it("should handle 2:1 rate", async function () {
      const rate = 2000000n; // 2:1

      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        swap.connect(user1).initiateSwap(
          await confidentialToken.getAddress(),
          await publicToken.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          rate
        )
      ).to.not.be.reverted;

      const swapInfo = await swap.getSwap(0);
      expect(swapInfo.rate).to.equal(rate);
    });

    it("should handle 0.5:1 rate", async function () {
      const rate = 500000n; // 0.5:1

      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        swap.connect(user1).initiateSwap(
          await confidentialToken.getAddress(),
          await publicToken.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          rate
        )
      ).to.not.be.reverted;
    });

    it("should reject zero rate", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await expect(
        swap.connect(user1).initiateSwap(
          await confidentialToken.getAddress(),
          await publicToken.getAddress(),
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          0n
        )
      ).to.be.revertedWithCustomError(swap, "InvalidRate");
    });
  });

  describe("View Functions", function () {
    it("should return correct swap count", async function () {
      expect(await swap.getSwapCount()).to.equal(0);

      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await swap.connect(user1).initiateSwap(
        await confidentialToken.getAddress(),
        await publicToken.getAddress(),
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        RATE
      );

      expect(await swap.getSwapCount()).to.equal(1);
    });

    it("should return user swaps", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await swap.getAddress(), user1.address)
        .add64(SWAP_AMOUNT)
        .encrypt();

      await swap.connect(user1).initiateSwap(
        await confidentialToken.getAddress(),
        await publicToken.getAddress(),
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        RATE
      );

      const userSwaps = await swap.getUserSwaps(user1.address);
      expect(userSwaps.length).to.equal(1);
      expect(userSwaps[0]).to.equal(0);
    });

    it("should return empty array for user with no swaps", async function () {
      const userSwaps = await swap.getUserSwaps(user2.address);
      expect(userSwaps.length).to.equal(0);
    });
  });
});
