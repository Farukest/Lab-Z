import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployDarkPoolFixture(account: HardhatEthersSigner) {
  const minOrderAmount = 10; // Minimum order amount

  const contractFactory = await hre.ethers.getContractFactory("DarkPool");
  const contract = await contractFactory.connect(account).deploy(minOrderAmount);
  await contract.waitForDeployment();
  return contract;
}

describe("DarkPool", function () {
  let darkPoolContract: ethers.Contract;
  let darkPoolContractAddress: string;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;

  before(async function () {
    [owner, buyer, seller] = await hre.ethers.getSigners();

    darkPoolContract = await deployDarkPoolFixture(owner);
    darkPoolContractAddress = await darkPoolContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(darkPoolContract, "DarkPool");
  });

  describe("Setup", function () {
    it("should have correct min order amount", async function () {
      expect(await darkPoolContract.minOrderAmount()).to.eq(10);
    });

    it("should start with no orders", async function () {
      expect(await darkPoolContract.getOrderCount()).to.eq(0);
    });

    it("should start with no matches", async function () {
      expect(await darkPoolContract.getMatchCount()).to.eq(0);
    });
  });

  describe("Buy Orders", function () {
    it("should place a buy order", async function () {
      const price = 100n;
      const amount = 50n;

      const priceInput = hre.fhevm.createEncryptedInput(darkPoolContractAddress, buyer.address);
      priceInput.add64(price);
      const encryptedPrice = await priceInput.encrypt();

      const amountInput = hre.fhevm.createEncryptedInput(darkPoolContractAddress, buyer.address);
      amountInput.add64(amount);
      const encryptedAmount = await amountInput.encrypt();

      const tx = await darkPoolContract.connect(buyer).placeBuyOrder(
        encryptedPrice.handles[0],
        encryptedPrice.inputProof,
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
      await tx.wait();

      expect(await darkPoolContract.getOrderCount()).to.eq(1);
      expect(await darkPoolContract.getActiveBuyOrderCount()).to.eq(1);
    });

    it("should return correct order info", async function () {
      const [trader, side, status] = await darkPoolContract.getOrderInfo(1);
      expect(trader).to.eq(buyer.address);
      expect(side).to.eq(0); // OrderSide.Buy
      expect(status).to.eq(0); // OrderStatus.Active
    });
  });

  describe("Sell Orders", function () {
    it("should place a sell order", async function () {
      const price = 95n; // Sell at 95 (below buy at 100, so should match)
      const amount = 30n;

      const priceInput = hre.fhevm.createEncryptedInput(darkPoolContractAddress, seller.address);
      priceInput.add64(price);
      const encryptedPrice = await priceInput.encrypt();

      const amountInput = hre.fhevm.createEncryptedInput(darkPoolContractAddress, seller.address);
      amountInput.add64(amount);
      const encryptedAmount = await amountInput.encrypt();

      const tx = await darkPoolContract.connect(seller).placeSellOrder(
        encryptedPrice.handles[0],
        encryptedPrice.inputProof,
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
      await tx.wait();

      expect(await darkPoolContract.getOrderCount()).to.eq(2);
      expect(await darkPoolContract.getActiveSellOrderCount()).to.eq(1);
    });

    it("should return correct sell order info", async function () {
      const [trader, side, status] = await darkPoolContract.getOrderInfo(2);
      expect(trader).to.eq(seller.address);
      expect(side).to.eq(1); // OrderSide.Sell
      expect(status).to.eq(0); // OrderStatus.Active
    });
  });

  describe("Order Cancellation", function () {
    let cancelOrderId: bigint;

    it("should place an order to cancel", async function () {
      const price = 200n;
      const amount = 100n;

      const priceInput = hre.fhevm.createEncryptedInput(darkPoolContractAddress, buyer.address);
      priceInput.add64(price);
      const encryptedPrice = await priceInput.encrypt();

      const amountInput = hre.fhevm.createEncryptedInput(darkPoolContractAddress, buyer.address);
      amountInput.add64(amount);
      const encryptedAmount = await amountInput.encrypt();

      const tx = await darkPoolContract.connect(buyer).placeBuyOrder(
        encryptedPrice.handles[0],
        encryptedPrice.inputProof,
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
      await tx.wait();

      cancelOrderId = 3n;
    });

    it("should allow order owner to cancel", async function () {
      const tx = await darkPoolContract.connect(buyer).cancelOrder(cancelOrderId);
      await tx.wait();

      const [, , status] = await darkPoolContract.getOrderInfo(cancelOrderId);
      expect(status).to.eq(3); // OrderStatus.Cancelled
    });

    it("should reject cancellation from non-owner", async function () {
      // Try to cancel order 1 (buyer's order) from seller
      await expect(
        darkPoolContract.connect(seller).cancelOrder(1)
      ).to.be.revertedWithCustomError(darkPoolContract, "NotOrderOwner");
    });
  });

  describe("Match Request", function () {
    it("should request match between buy and sell orders", async function () {
      const buyOrderId = 1;
      const sellOrderId = 2;

      const tx = await darkPoolContract.requestMatch(buyOrderId, sellOrderId);
      const receipt = await tx.wait();

      expect(await darkPoolContract.getMatchCount()).to.eq(1);

      // Check match info
      const [buyId, sellId, isResolved] = await darkPoolContract.getMatchInfo(1);
      expect(buyId).to.eq(buyOrderId);
      expect(sellId).to.eq(sellOrderId);
      expect(isResolved).to.be.false;
    });

    it("should get match handle for decryption", async function () {
      const matchHandle = await darkPoolContract.getMatchHandle(1);
      expect(matchHandle).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("should reject matching non-existent orders", async function () {
      await expect(
        darkPoolContract.requestMatch(999, 2)
      ).to.be.revertedWithCustomError(darkPoolContract, "OrderNotFound");
    });

    it("should reject matching cancelled orders", async function () {
      await expect(
        darkPoolContract.requestMatch(3, 2) // Order 3 is cancelled
      ).to.be.revertedWithCustomError(darkPoolContract, "OrderNotActive");
    });
  });

  describe("Encrypted Order Data", function () {
    it("should return encrypted price handle", async function () {
      const priceHandle = await darkPoolContract.getOrderPrice(1);
      expect(priceHandle).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("should return encrypted amount handle", async function () {
      const amountHandle = await darkPoolContract.getOrderAmount(1);
      expect(amountHandle).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });
});
