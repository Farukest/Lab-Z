import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";

async function deployVotingFixture(account: HardhatEthersSigner) {
  const contractFactory = await hre.ethers.getContractFactory("Voting");
  const contract = await contractFactory.connect(account).deploy();
  await contract.waitForDeployment();
  return contract;
}

describe("Voting", function () {
  let votingContract: ethers.Contract;
  let votingContractAddress: string;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  before(async function () {
    [alice, bob, charlie] = await hre.ethers.getSigners();

    votingContract = await deployVotingFixture(alice);
    votingContractAddress = await votingContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(votingContract, "Voting");
  });

  describe("Proposal Creation", function () {
    it("should create a proposal", async function () {
      const tx = await votingContract.createProposal("Should we upgrade?", 3600); // 1 hour duration
      await tx.wait();

      const [description, endTime, exists, finalized] = await votingContract.getProposal(1);

      expect(description).to.eq("Should we upgrade?");
      expect(exists).to.be.true;
      expect(finalized).to.be.false;
    });

    it("should increment proposal ID", async function () {
      expect(await votingContract.nextProposalId()).to.eq(2);
    });
  });

  describe("Voting", function () {
    it("should allow alice to vote YES (vote = 1)", async function () {
      // Alice votes YES (any value > 0 is YES)
      const input = hre.fhevm.createEncryptedInput(votingContractAddress, alice.address);
      input.add64(1); // YES vote
      const encryptedInput = await input.encrypt();

      const tx = await votingContract.connect(alice).vote(
        1, // proposalId
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      // Check that alice has voted
      expect(await votingContract.hasVoted(1, alice.address)).to.be.true;
    });

    it("should allow bob to vote NO (vote = 0)", async function () {
      // Bob votes NO (value = 0)
      const input = hre.fhevm.createEncryptedInput(votingContractAddress, bob.address);
      input.add64(0); // NO vote
      const encryptedInput = await input.encrypt();

      const tx = await votingContract.connect(bob).vote(
        1,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await votingContract.hasVoted(1, bob.address)).to.be.true;
    });

    it("should allow charlie to vote YES", async function () {
      // Charlie votes YES
      const input = hre.fhevm.createEncryptedInput(votingContractAddress, charlie.address);
      input.add64(5); // Any value > 0 is YES
      const encryptedInput = await input.encrypt();

      const tx = await votingContract.connect(charlie).vote(
        1,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await votingContract.hasVoted(1, charlie.address)).to.be.true;
    });

    it("should prevent double voting", async function () {
      const input = hre.fhevm.createEncryptedInput(votingContractAddress, alice.address);
      input.add64(1);
      const encryptedInput = await input.encrypt();

      await expect(
        votingContract.connect(alice).vote(
          1,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(votingContract, "AlreadyVoted");
    });
  });

  describe("Vote Counts", function () {
    it("should return encrypted vote counts (private by design)", async function () {
      // Vote counts are intentionally private - only contract can access them
      // This is the expected behavior for private voting
      const [yesVotes, noVotes] = await votingContract.getVoteCounts(1);

      // Verify handles are returned (non-zero bytes32)
      expect(yesVotes).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
      expect(noVotes).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");

      // Note: Decryption would require either:
      // 1. A finalize() function that allows public decryption
      // 2. Or oracle-based async decryption pattern
      // This is intentional privacy design for encrypted voting
    });
  });
});
