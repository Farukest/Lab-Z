import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployTokenFixture(account: HardhatEthersSigner) {
  const contractFactory = await hre.ethers.getContractFactory("Token");
  const contract = await contractFactory.connect(account).deploy("TestToken", "TTK");
  await contract.waitForDeployment();
  return contract;
}

describe("Token", function () {
  let tokenContract: ethers.Contract;
  let tokenContractAddress: string;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  before(async function () {
    [alice, bob] = await hre.ethers.getSigners();

    tokenContract = await deployTokenFixture(alice);
    tokenContractAddress = await tokenContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(tokenContract, "Token");
  });

  describe("Metadata", function () {
    it("should return correct name", async function () {
      expect(await tokenContract.name()).to.eq("TestToken");
    });

    it("should return correct symbol", async function () {
      expect(await tokenContract.symbol()).to.eq("TTK");
    });
  });

  describe("Mint", function () {
    it("should mint tokens to alice", async function () {
      // Create encrypted input for mint (1000 tokens)
      const input = hre.fhevm.createEncryptedInput(tokenContractAddress, alice.address);
      input.add64(1000);
      const encryptedInput = await input.encrypt();

      // Mint tokens to alice
      const tx = await tokenContract.mint(
        alice.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      // Get alice's encrypted balance
      const encryptedBalance = await tokenContract.balanceOf(alice.address);

      // Decrypt and verify
      const clearBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        tokenContractAddress,
        alice as unknown as ethers.Signer
      );

      expect(clearBalance).to.eq(1000);
    });

    it("should mint more tokens and update balance", async function () {
      // Mint 500 more tokens to alice
      const input = hre.fhevm.createEncryptedInput(tokenContractAddress, alice.address);
      input.add64(500);
      const encryptedInput = await input.encrypt();

      const tx = await tokenContract.mint(
        alice.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      // Get alice's encrypted balance (should be 1500)
      const encryptedBalance = await tokenContract.balanceOf(alice.address);

      const clearBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        tokenContractAddress,
        alice as unknown as ethers.Signer
      );

      expect(clearBalance).to.eq(1500);
    });
  });

  describe("Transfer", function () {
    it("should transfer tokens from alice to bob", async function () {
      // Alice transfers 300 tokens to bob
      const input = hre.fhevm.createEncryptedInput(tokenContractAddress, alice.address);
      input.add64(300);
      const encryptedInput = await input.encrypt();

      const tx = await tokenContract.connect(alice).transfer(
        bob.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      // Check alice's balance (should be 1500 - 300 = 1200)
      const aliceEncryptedBalance = await tokenContract.balanceOf(alice.address);
      const aliceClearBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceEncryptedBalance,
        tokenContractAddress,
        alice as unknown as ethers.Signer
      );
      expect(aliceClearBalance).to.eq(1200);

      // Check bob's balance (should be 300)
      const bobEncryptedBalance = await tokenContract.balanceOf(bob.address);
      const bobClearBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        bobEncryptedBalance,
        tokenContractAddress,
        bob as unknown as ethers.Signer
      );
      expect(bobClearBalance).to.eq(300);
    });

    it("should handle transfer exceeding balance (no transfer occurs)", async function () {
      // Bob tries to transfer 500 tokens (only has 300)
      const input = hre.fhevm.createEncryptedInput(tokenContractAddress, bob.address);
      input.add64(500);
      const encryptedInput = await input.encrypt();

      const tx = await tokenContract.connect(bob).transfer(
        alice.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      // Bob's balance should still be 300 (transfer didn't happen)
      const bobEncryptedBalance = await tokenContract.balanceOf(bob.address);
      const bobClearBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        bobEncryptedBalance,
        tokenContractAddress,
        bob as unknown as ethers.Signer
      );
      expect(bobClearBalance).to.eq(300);

      // Alice's balance should still be 1200
      const aliceEncryptedBalance = await tokenContract.balanceOf(alice.address);
      const aliceClearBalance = await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceEncryptedBalance,
        tokenContractAddress,
        alice as unknown as ethers.Signer
      );
      expect(aliceClearBalance).to.eq(1200);
    });
  });
});
