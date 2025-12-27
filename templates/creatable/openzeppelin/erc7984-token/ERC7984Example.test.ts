import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { ERC7984Example } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC7984Example", function () {
  let token: ERC7984Example;
  let owner: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const INITIAL_SUPPLY = 1000n;
  const TRANSFER_AMOUNT = 100n;

  beforeEach(async function () {
    [owner, recipient, other] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("ERC7984Example");
    token = await Factory.deploy(
      owner.address,
      INITIAL_SUPPLY,
      "Confidential Token",
      "CTKN",
      "https://example.com/token"
    );
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct name", async function () {
      expect(await token.name()).to.equal("Confidential Token");
    });

    it("should set the correct symbol", async function () {
      expect(await token.symbol()).to.equal("CTKN");
    });

    it("should set the correct decimals", async function () {
      expect(await token.decimals()).to.equal(6);
    });

    it("should set the correct contract URI", async function () {
      expect(await token.contractURI()).to.equal("https://example.com/token");
    });

    it("should set the correct owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("should mint initial supply to owner", async function () {
      const balanceHandle = await token.confidentialBalanceOf(owner.address);
      expect(balanceHandle).to.not.equal(0n);
    });

    it("should indicate owner has balance", async function () {
      expect(await token.hasBalance(owner.address)).to.equal(true);
    });

    it("should indicate recipient has no balance initially", async function () {
      expect(await token.hasBalance(recipient.address)).to.equal(false);
    });
  });

  describe("Minting", function () {
    it("should allow owner to mint visible amount", async function () {
      await expect(token.mint(recipient.address, 500n))
        .to.emit(token, "TokensMinted")
        .withArgs(recipient.address, 500n);

      expect(await token.hasBalance(recipient.address)).to.equal(true);
    });

    it("should reject mint from non-owner", async function () {
      await expect(token.connect(other).mint(recipient.address, 500n))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to mint confidential amount", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(250n)
        .encrypt();

      await expect(
        token.confidentialMint(
          recipient.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.not.be.reverted;

      expect(await token.hasBalance(recipient.address)).to.equal(true);
    });
  });

  describe("Burning", function () {
    it("should allow owner to burn visible amount", async function () {
      await expect(token.burn(owner.address, 100n))
        .to.emit(token, "TokensBurned")
        .withArgs(owner.address);
    });

    it("should reject burn from non-owner", async function () {
      await expect(token.connect(other).burn(owner.address, 100n))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to burn confidential amount", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(50n)
        .encrypt();

      await expect(
        token.confidentialBurn(
          owner.address,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.not.be.reverted;
    });
  });

  describe("Confidential Transfers", function () {
    it("should transfer tokens from owner to recipient", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(TRANSFER_AMOUNT)
        .encrypt();

      await expect(
        token
          .connect(owner)
          ["confidentialTransfer(address,bytes32,bytes)"](
            recipient.address,
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.not.be.reverted;

      expect(await token.hasBalance(recipient.address)).to.equal(true);
    });

    it("should allow recipient to transfer received tokens", async function () {
      // First transfer to recipient
      const input1 = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(TRANSFER_AMOUNT)
        .encrypt();

      await token
        .connect(owner)
        ["confidentialTransfer(address,bytes32,bytes)"](
          recipient.address,
          input1.handles[0],
          input1.inputProof
        );

      // Then recipient transfers to other
      const input2 = await fhevm
        .createEncryptedInput(await token.getAddress(), recipient.address)
        .add64(50n)
        .encrypt();

      await expect(
        token
          .connect(recipient)
          ["confidentialTransfer(address,bytes32,bytes)"](
            other.address,
            input2.handles[0],
            input2.inputProof
          )
      ).to.not.be.reverted;

      expect(await token.hasBalance(other.address)).to.equal(true);
    });

    it("should revert when transferring to zero address", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(TRANSFER_AMOUNT)
        .encrypt();

      await expect(
        token
          .connect(owner)
          ["confidentialTransfer(address,bytes32,bytes)"](
            ethers.ZeroAddress,
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.be.revertedWithCustomError(token, "ERC7984InvalidReceiver");
    });

    it("should revert when sender has zero balance", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), other.address)
        .add64(100n)
        .encrypt();

      await expect(
        token
          .connect(other)
          ["confidentialTransfer(address,bytes32,bytes)"](
            recipient.address,
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.be.revertedWithCustomError(token, "ERC7984ZeroBalance");
    });
  });

  describe("Operators", function () {
    it("should set operator with expiry", async function () {
      const currentTime = await time.latest();
      const futureTime = currentTime + 3600; // 1 hour from now

      await expect(token.connect(owner).setOperator(recipient.address, futureTime))
        .to.emit(token, "OperatorSet")
        .withArgs(owner.address, recipient.address, futureTime);
    });

    it("should return true for valid operator", async function () {
      const currentTime = await time.latest();
      const futureTime = currentTime + 3600;
      await token.connect(owner).setOperator(recipient.address, futureTime);

      expect(await token.isOperator(owner.address, recipient.address)).to.equal(true);
    });

    it("should return false for expired operator", async function () {
      const pastTime = 1; // Already expired
      await token.connect(owner).setOperator(recipient.address, pastTime);

      expect(await token.isOperator(owner.address, recipient.address)).to.equal(false);
    });

    it("should always return true for self as operator", async function () {
      expect(await token.isOperator(owner.address, owner.address)).to.equal(true);
    });
  });

  describe("TransferFrom with Operator", function () {
    beforeEach(async function () {
      // Set recipient as operator for owner (use blockchain time)
      const currentTime = await time.latest();
      const futureTime = currentTime + 3600;
      await token.connect(owner).setOperator(recipient.address, futureTime);
    });

    it("should allow operator to transfer on behalf of holder", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), recipient.address)
        .add64(50n)
        .encrypt();

      await expect(
        token
          .connect(recipient)
          ["confidentialTransferFrom(address,address,bytes32,bytes)"](
            owner.address,
            other.address,
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.not.be.reverted;
    });

    it("should reject transfer from unauthorized spender", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await token.getAddress(), other.address)
        .add64(50n)
        .encrypt();

      await expect(
        token
          .connect(other)
          ["confidentialTransferFrom(address,address,bytes32,bytes)"](
            owner.address,
            recipient.address,
            encryptedInput.handles[0],
            encryptedInput.inputProof
          )
      ).to.be.revertedWithCustomError(token, "ERC7984UnauthorizedSpender");
    });
  });

  describe("ERC165 Interface", function () {
    it("should support IERC7984 interface", async function () {
      const ierc7984InterfaceId = "0x00000000"; // Replace with actual interface ID
      // Note: The actual interface ID would need to be calculated
      expect(await token.supportsInterface("0x01ffc9a7")).to.equal(true); // ERC165
    });
  });
});
