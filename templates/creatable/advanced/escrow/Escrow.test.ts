import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

async function deployEscrowFixture(account: HardhatEthersSigner) {
  const escrowFeeRate = 100; // 1% fee
  const feeRecipient = account.address;

  const contractFactory = await hre.ethers.getContractFactory("Escrow");
  const contract = await contractFactory.connect(account).deploy(escrowFeeRate, feeRecipient);
  await contract.waitForDeployment();
  return contract;
}

describe("Escrow", function () {
  let escrowContract: ethers.Contract;
  let escrowContractAddress: string;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let arbiter: HardhatEthersSigner;

  before(async function () {
    [owner, buyer, seller, arbiter] = await hre.ethers.getSigners();

    escrowContract = await deployEscrowFixture(owner);
    escrowContractAddress = await escrowContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(escrowContract, "Escrow");
  });

  describe("Setup", function () {
    it("should have correct fee rate", async function () {
      expect(await escrowContract.escrowFeeRate()).to.eq(100);
    });

    it("should have correct fee recipient", async function () {
      expect(await escrowContract.feeRecipient()).to.eq(owner.address);
    });

    it("should start with no escrows", async function () {
      expect(await escrowContract.getEscrowCount()).to.eq(0);
    });
  });

  describe("Creating Escrow", function () {
    it("should create an escrow", async function () {
      const amount = 1000n;
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

      const input = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      input.add64(amount);
      const encryptedInput = await input.encrypt();

      const tx = await escrowContract.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        "Product purchase",
        deadline
      );
      await tx.wait();

      expect(await escrowContract.getEscrowCount()).to.eq(1);
    });

    it("should return correct escrow info", async function () {
      const [buyerAddr, sellerAddr, arbiterAddr, state, description, deadline] =
        await escrowContract.getEscrow(0);

      expect(buyerAddr).to.eq(buyer.address);
      expect(sellerAddr).to.eq(seller.address);
      expect(arbiterAddr).to.eq(arbiter.address);
      expect(state).to.eq(0); // EscrowState.Created
      expect(description).to.eq("Product purchase");
    });

    it("should reject self-escrow", async function () {
      const amount = 1000n;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const input = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      input.add64(amount);
      const encryptedInput = await input.encrypt();

      await expect(
        escrowContract.connect(buyer).createEscrow(
          buyer.address, // Self as seller
          arbiter.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          "Self escrow",
          deadline
        )
      ).to.be.revertedWithCustomError(escrowContract, "CannotSelfEscrow");
    });

    it("should be active initially", async function () {
      expect(await escrowContract.isActive(0)).to.be.true;
    });
  });

  describe("Funding Escrow", function () {
    it("should fund the escrow", async function () {
      const fundAmount = 1000n;

      const input = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      input.add64(fundAmount);
      const encryptedInput = await input.encrypt();

      const tx = await escrowContract.connect(buyer).fundEscrow(
        0,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      const [, , , state] = await escrowContract.getEscrow(0);
      expect(state).to.eq(1); // EscrowState.Funded
    });

    it("should reject funding from non-buyer", async function () {
      // Create a new escrow for this test since escrow 0 is already funded
      const amount = 500n;
      const currentTime = await time.latest();
      const deadline = currentTime + 86400;

      const createInput = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      createInput.add64(amount);
      const encryptedCreate = await createInput.encrypt();

      await escrowContract.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        encryptedCreate.handles[0],
        encryptedCreate.inputProof,
        "Funding test",
        deadline
      );

      const newEscrowId = Number(await escrowContract.getEscrowCount()) - 1;

      const fundAmount = 500n;
      const fundInput = hre.fhevm.createEncryptedInput(escrowContractAddress, seller.address);
      fundInput.add64(fundAmount);
      const encryptedFund = await fundInput.encrypt();

      await expect(
        escrowContract.connect(seller).fundEscrow(
          newEscrowId,
          encryptedFund.handles[0],
          encryptedFund.inputProof
        )
      ).to.be.revertedWith("Only buyer");
    });
  });

  describe("Releasing Funds", function () {
    let releaseEscrowId: number;

    before(async function () {
      // Create and fund a new escrow for release testing
      const amount = 500n;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const input = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      input.add64(amount);
      const encryptedInput = await input.encrypt();

      const tx = await escrowContract.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        "Release test",
        deadline
      );
      await tx.wait();

      releaseEscrowId = 1;

      // Fund it
      const fundInput = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      fundInput.add64(amount);
      const encryptedFund = await fundInput.encrypt();

      const fundTx = await escrowContract.connect(buyer).fundEscrow(
        releaseEscrowId,
        encryptedFund.handles[0],
        encryptedFund.inputProof
      );
      await fundTx.wait();
    });

    it("should release funds to seller", async function () {
      const tx = await escrowContract.connect(buyer).releaseFunds(releaseEscrowId);
      await tx.wait();

      const [, , , state] = await escrowContract.getEscrow(releaseEscrowId);
      expect(state).to.eq(2); // EscrowState.Released
    });

    it("should not be active after release", async function () {
      expect(await escrowContract.isActive(releaseEscrowId)).to.be.false;
    });

    it("should reject release from non-buyer", async function () {
      // Create another escrow
      const amount = 200n;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      const input = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      input.add64(amount);
      const encryptedInput = await input.encrypt();

      await escrowContract.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        "Another test",
        deadline
      );

      // Fund it
      const fundInput = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      fundInput.add64(amount);
      const encryptedFund = await fundInput.encrypt();

      await escrowContract.connect(buyer).fundEscrow(
        2,
        encryptedFund.handles[0],
        encryptedFund.inputProof
      );

      // Try to release from seller (should fail)
      await expect(
        escrowContract.connect(seller).releaseFunds(2)
      ).to.be.revertedWith("Only buyer can release");
    });
  });

  describe("Dispute Flow", function () {
    let disputeEscrowId: number;

    before(async function () {
      // Create and fund a new escrow for dispute testing
      const amount = 300n;
      const currentTime = await time.latest();
      const deadline = currentTime + 86400;

      const input = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      input.add64(amount);
      const encryptedInput = await input.encrypt();

      const tx = await escrowContract.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        "Dispute test",
        deadline
      );
      await tx.wait();

      disputeEscrowId = Number(await escrowContract.getEscrowCount()) - 1;

      // Fund it
      const fundInput = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      fundInput.add64(amount);
      const encryptedFund = await fundInput.encrypt();

      await escrowContract.connect(buyer).fundEscrow(
        disputeEscrowId,
        encryptedFund.handles[0],
        encryptedFund.inputProof
      );
    });

    it("should raise dispute", async function () {
      const tx = await escrowContract.connect(buyer).dispute(disputeEscrowId);
      await tx.wait();

      const [, , , state] = await escrowContract.getEscrow(disputeEscrowId);
      expect(state).to.eq(4); // EscrowState.Disputed
    });

    it("should resolve dispute in favor of seller", async function () {
      const tx = await escrowContract.connect(arbiter).resolveDispute(disputeEscrowId, true);
      await tx.wait();

      const [, , , state] = await escrowContract.getEscrow(disputeEscrowId);
      expect(state).to.eq(2); // EscrowState.Released (to seller)
    });

    it("should reject dispute resolution from non-arbiter", async function () {
      // Create another disputed escrow
      const amount = 100n;
      const currentTime = await time.latest();
      const deadline = currentTime + 86400;

      const input = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      input.add64(amount);
      const encryptedInput = await input.encrypt();

      await escrowContract.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        "Another dispute",
        deadline
      );

      const newEscrowId = Number(await escrowContract.getEscrowCount()) - 1;

      const fundInput = hre.fhevm.createEncryptedInput(escrowContractAddress, buyer.address);
      fundInput.add64(amount);
      const encryptedFund = await fundInput.encrypt();

      await escrowContract.connect(buyer).fundEscrow(
        newEscrowId,
        encryptedFund.handles[0],
        encryptedFund.inputProof
      );

      await escrowContract.connect(seller).dispute(newEscrowId);

      // Try to resolve from buyer (should fail)
      await expect(
        escrowContract.connect(buyer).resolveDispute(newEscrowId, true)
      ).to.be.revertedWith("Only arbiter");
    });
  });
});
