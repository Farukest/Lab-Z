import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { EscrowERC7984, ERC7984Example } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("EscrowERC7984", function () {
  let escrow: EscrowERC7984;
  let token: ERC7984Example;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let arbiter: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const ESCROW_AMOUNT = 500n;
  const DEADLINE = 86400; // 1 day

  beforeEach(async function () {
    [owner, buyer, seller, arbiter, other] = await ethers.getSigners();

    // Deploy token
    const TokenFactory = await ethers.getContractFactory("ERC7984Example");
    token = await TokenFactory.deploy(
      owner.address,
      10000n,
      "Escrow Token",
      "ESCRW",
      "https://example.com/escrow"
    );
    await token.waitForDeployment();

    // Give tokens to buyer
    await token.mint(buyer.address, 2000n);

    // Deploy escrow
    const EscrowFactory = await ethers.getContractFactory("EscrowERC7984");
    escrow = await EscrowFactory.deploy();
    await escrow.waitForDeployment();

    // Set escrow as operator for buyer (use blockchain time)
    const currentTime = await time.latest();
    const futureTime = currentTime + DEADLINE + 3600;
    await token.connect(buyer).setOperator(await escrow.getAddress(), futureTime);
  });

  describe("Escrow Creation", function () {
    it("should create an escrow", async function () {
      await expect(
        escrow.connect(buyer).createEscrow(
          seller.address,
          arbiter.address,
          await token.getAddress(),
          DEADLINE
        )
      )
        .to.emit(escrow, "EscrowCreated")
        .withArgs(0, buyer.address, seller.address);

      const escrowData = await escrow.getEscrow(0);
      expect(escrowData.buyer).to.equal(buyer.address);
      expect(escrowData.seller).to.equal(seller.address);
      expect(escrowData.arbiter).to.equal(arbiter.address);
    });

    it("should increment escrow counter", async function () {
      await escrow.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        await token.getAddress(),
        DEADLINE
      );

      expect(await escrow.getEscrowCount()).to.equal(1);

      await escrow.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        await token.getAddress(),
        DEADLINE
      );

      expect(await escrow.getEscrowCount()).to.equal(2);
    });
  });

  describe("Deposits", function () {
    let escrowId: number;

    beforeEach(async function () {
      const tx = await escrow.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        await token.getAddress(),
        DEADLINE
      );
      escrowId = 0;
    });

    it("should allow buyer to deposit", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await escrow.getAddress(), buyer.address)
        .add64(ESCROW_AMOUNT)
        .encrypt();

      await expect(
        escrow.connect(buyer).deposit(
          escrowId,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      )
        .to.emit(escrow, "EscrowDeposited")
        .withArgs(escrowId);

      expect(await escrow.getEscrowState(escrowId)).to.equal(1); // Funded
    });

    it("should reject deposit from non-buyer", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await escrow.getAddress(), seller.address)
        .add64(ESCROW_AMOUNT)
        .encrypt();

      await expect(
        escrow.connect(seller).deposit(
          escrowId,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("should reject deposit to non-existent escrow", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await escrow.getAddress(), buyer.address)
        .add64(ESCROW_AMOUNT)
        .encrypt();

      await expect(
        escrow.connect(buyer).deposit(
          99,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(escrow, "EscrowNotFound");
    });
  });

  describe("Release", function () {
    let escrowId: number;

    beforeEach(async function () {
      await escrow.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        await token.getAddress(),
        DEADLINE
      );
      escrowId = 0;

      const encryptedInput = await fhevm
        .createEncryptedInput(await escrow.getAddress(), buyer.address)
        .add64(ESCROW_AMOUNT)
        .encrypt();

      await escrow.connect(buyer).deposit(
        escrowId,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
    });

    it("should allow buyer to release to seller", async function () {
      await expect(escrow.connect(buyer).release(escrowId))
        .to.emit(escrow, "EscrowReleased")
        .withArgs(escrowId);

      expect(await escrow.getEscrowState(escrowId)).to.equal(2); // Released
    });

    it("should reject release from non-buyer", async function () {
      await expect(escrow.connect(seller).release(escrowId))
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("should reject double release", async function () {
      await escrow.connect(buyer).release(escrowId);

      await expect(escrow.connect(buyer).release(escrowId))
        .to.be.revertedWithCustomError(escrow, "EscrowAlreadyReleased");
    });
  });

  describe("Refund", function () {
    let escrowId: number;

    beforeEach(async function () {
      await escrow.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        await token.getAddress(),
        DEADLINE
      );
      escrowId = 0;

      const encryptedInput = await fhevm
        .createEncryptedInput(await escrow.getAddress(), buyer.address)
        .add64(ESCROW_AMOUNT)
        .encrypt();

      await escrow.connect(buyer).deposit(
        escrowId,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
    });

    it("should allow seller to refund to buyer", async function () {
      await expect(escrow.connect(seller).refund(escrowId))
        .to.emit(escrow, "EscrowRefunded")
        .withArgs(escrowId);

      expect(await escrow.getEscrowState(escrowId)).to.equal(3); // Refunded
    });

    it("should reject refund from non-seller", async function () {
      await expect(escrow.connect(buyer).refund(escrowId))
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });
  });

  describe("Disputes", function () {
    let escrowId: number;

    beforeEach(async function () {
      await escrow.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        await token.getAddress(),
        DEADLINE
      );
      escrowId = 0;

      const encryptedInput = await fhevm
        .createEncryptedInput(await escrow.getAddress(), buyer.address)
        .add64(ESCROW_AMOUNT)
        .encrypt();

      await escrow.connect(buyer).deposit(
        escrowId,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
    });

    it("should allow buyer to raise dispute", async function () {
      await expect(escrow.connect(buyer).dispute(escrowId))
        .to.emit(escrow, "EscrowDisputed")
        .withArgs(escrowId);

      expect(await escrow.getEscrowState(escrowId)).to.equal(4); // Disputed
    });

    it("should allow seller to raise dispute", async function () {
      await expect(escrow.connect(seller).dispute(escrowId))
        .to.emit(escrow, "EscrowDisputed")
        .withArgs(escrowId);
    });

    it("should reject dispute from non-party", async function () {
      await expect(escrow.connect(other).dispute(escrowId))
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    describe("Dispute Resolution", function () {
      beforeEach(async function () {
        await escrow.connect(buyer).dispute(escrowId);
      });

      it("should allow arbiter to resolve in favor of seller", async function () {
        await expect(escrow.connect(arbiter).resolveDispute(escrowId, true))
          .to.emit(escrow, "DisputeResolved")
          .withArgs(escrowId, true);

        expect(await escrow.getEscrowState(escrowId)).to.equal(2); // Released
      });

      it("should allow arbiter to resolve in favor of buyer", async function () {
        await expect(escrow.connect(arbiter).resolveDispute(escrowId, false))
          .to.emit(escrow, "DisputeResolved")
          .withArgs(escrowId, false);

        expect(await escrow.getEscrowState(escrowId)).to.equal(3); // Refunded
      });

      it("should reject resolution from non-arbiter", async function () {
        await expect(escrow.connect(buyer).resolveDispute(escrowId, true))
          .to.be.revertedWithCustomError(escrow, "NotAuthorized");
      });

      it("should reject resolution of non-disputed escrow", async function () {
        // Create and fund new escrow without dispute
        await escrow.connect(buyer).createEscrow(
          seller.address,
          arbiter.address,
          await token.getAddress(),
          DEADLINE
        );

        const encryptedInput = await fhevm
          .createEncryptedInput(await escrow.getAddress(), buyer.address)
          .add64(ESCROW_AMOUNT)
          .encrypt();

        await escrow.connect(buyer).deposit(
          1,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        );

        await expect(escrow.connect(arbiter).resolveDispute(1, true))
          .to.be.revertedWithCustomError(escrow, "EscrowNotInDispute");
      });
    });
  });

  describe("View Functions", function () {
    it("should return correct escrow count", async function () {
      expect(await escrow.getEscrowCount()).to.equal(0);

      await escrow.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        await token.getAddress(),
        DEADLINE
      );

      expect(await escrow.getEscrowCount()).to.equal(1);
    });

    it("should return correct escrow state", async function () {
      await escrow.connect(buyer).createEscrow(
        seller.address,
        arbiter.address,
        await token.getAddress(),
        DEADLINE
      );

      expect(await escrow.getEscrowState(0)).to.equal(0); // Created
    });
  });
});
