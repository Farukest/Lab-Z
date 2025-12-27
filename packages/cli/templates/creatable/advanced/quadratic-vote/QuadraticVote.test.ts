import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

async function deployQuadraticVoteFixture(account: HardhatEthersSigner) {
  const initialCredits = 100;

  const contractFactory = await hre.ethers.getContractFactory("QuadraticVote");
  const contract = await contractFactory.connect(account).deploy(initialCredits);
  await contract.waitForDeployment();
  return contract;
}

describe("QuadraticVote", function () {
  let quadraticVoteContract: ethers.Contract;
  let quadraticVoteContractAddress: string;
  let owner: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let voter3: HardhatEthersSigner;

  before(async function () {
    [owner, voter1, voter2, voter3] = await hre.ethers.getSigners();

    quadraticVoteContract = await deployQuadraticVoteFixture(owner);
    quadraticVoteContractAddress = await quadraticVoteContract.getAddress();

    await hre.fhevm.assertCoprocessorInitialized(quadraticVoteContract, "QuadraticVote");
  });

  describe("Setup", function () {
    it("should have correct initial credits", async function () {
      expect(await quadraticVoteContract.initialCredits()).to.eq(100);
    });

    it("should start with no proposals", async function () {
      expect(await quadraticVoteContract.getProposalCount()).to.eq(0);
    });
  });

  describe("Vote Cost Calculations", function () {
    it("should calculate cost for 1 vote = 1 credit", async function () {
      expect(await quadraticVoteContract.calculateCost(1)).to.eq(1);
    });

    it("should calculate cost for 2 votes = 4 credits", async function () {
      expect(await quadraticVoteContract.calculateCost(2)).to.eq(4);
    });

    it("should calculate cost for 5 votes = 25 credits", async function () {
      expect(await quadraticVoteContract.calculateCost(5)).to.eq(25);
    });

    it("should calculate cost for 10 votes = 100 credits", async function () {
      expect(await quadraticVoteContract.calculateCost(10)).to.eq(100);
    });

    it("should calculate max votes from 100 credits = 10", async function () {
      expect(await quadraticVoteContract.calculateMaxVotes(100)).to.eq(10);
    });

    it("should calculate max votes from 25 credits = 5", async function () {
      expect(await quadraticVoteContract.calculateMaxVotes(25)).to.eq(5);
    });
  });

  describe("Proposal Creation", function () {
    it("should create a proposal", async function () {
      const tx = await quadraticVoteContract.createProposal("Increase budget?", 3600);
      await tx.wait();

      expect(await quadraticVoteContract.getProposalCount()).to.eq(1);
    });

    it("should return correct proposal info", async function () {
      const [description, deadline, tallied, revealRequested, revealed, voterCount] =
        await quadraticVoteContract.getProposal(0);

      expect(description).to.eq("Increase budget?");
      expect(tallied).to.be.false;
      expect(revealRequested).to.be.false;
      expect(revealed).to.be.false;
      expect(voterCount).to.eq(0);
    });
  });

  describe("Credit Allocation", function () {
    it("should allocate credits to voter1", async function () {
      const credits = 100n;

      const input = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, owner.address);
      input.add64(credits);
      const encryptedInput = await input.encrypt();

      const tx = await quadraticVoteContract.allocateCredits(
        voter1.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();
    });

    it("should allocate credits to voter2", async function () {
      const credits = 50n;

      const input = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, owner.address);
      input.add64(credits);
      const encryptedInput = await input.encrypt();

      const tx = await quadraticVoteContract.allocateCredits(
        voter2.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();
    });

    it("should allocate credits to voter3", async function () {
      const credits = 25n;

      const input = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, owner.address);
      input.add64(credits);
      const encryptedInput = await input.encrypt();

      const tx = await quadraticVoteContract.allocateCredits(
        voter3.address,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();
    });
  });

  describe("Voting", function () {
    it("should allow voter1 to cast 5 YES votes (25 credits)", async function () {
      const votes = 5n;

      const input = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, voter1.address);
      input.add64(votes);
      const encryptedInput = await input.encrypt();

      const tx = await quadraticVoteContract.connect(voter1).castVote(
        0, // proposalId
        true, // support YES
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await quadraticVoteContract.hasVoted(0, voter1.address)).to.be.true;
    });

    it("should allow voter2 to cast 3 NO votes (9 credits)", async function () {
      const votes = 3n;

      const input = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, voter2.address);
      input.add64(votes);
      const encryptedInput = await input.encrypt();

      const tx = await quadraticVoteContract.connect(voter2).castVote(
        0,
        false, // support NO
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      expect(await quadraticVoteContract.hasVoted(0, voter2.address)).to.be.true;
    });

    it("should allow voter3 to cast 2 YES votes (4 credits)", async function () {
      const votes = 2n;

      const input = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, voter3.address);
      input.add64(votes);
      const encryptedInput = await input.encrypt();

      const tx = await quadraticVoteContract.connect(voter3).castVote(
        0,
        true,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();
    });

    it("should update voter count", async function () {
      const [, , , , , voterCount] = await quadraticVoteContract.getProposal(0);
      expect(voterCount).to.eq(3);
    });

    it("should reject double voting", async function () {
      const votes = 1n;

      const input = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, voter1.address);
      input.add64(votes);
      const encryptedInput = await input.encrypt();

      await expect(
        quadraticVoteContract.connect(voter1).castVote(
          0,
          true,
          encryptedInput.handles[0],
          encryptedInput.inputProof
        )
      ).to.be.revertedWithCustomError(quadraticVoteContract, "AlreadyVoted");
    });
  });

  describe("Tallying", function () {
    let tallyProposalId: number;

    before(async function () {
      // Create a proposal with 60 second duration
      const tx = await quadraticVoteContract.createProposal("Quick tally test?", 60);
      await tx.wait();
      tallyProposalId = Number(await quadraticVoteContract.getProposalCount()) - 1;

      // Allocate credits and vote (reusing voter1's credits from earlier)
      const voteInput = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, voter1.address);
      voteInput.add64(1n);
      const encryptedVote = await voteInput.encrypt();

      await quadraticVoteContract.connect(voter1).castVote(
        tallyProposalId,
        true,
        encryptedVote.handles[0],
        encryptedVote.inputProof
      );

      // Advance time past deadline
      await time.increase(61);
    });

    it("should tally votes after deadline", async function () {
      const tx = await quadraticVoteContract.tallyVotes(tallyProposalId);
      await tx.wait();

      const [, , tallied] = await quadraticVoteContract.getProposal(tallyProposalId);
      expect(tallied).to.be.true;
    });

    it("should reject tally before deadline", async function () {
      // Create fresh proposal with long deadline
      await quadraticVoteContract.createProposal("Future tally?", 3600);
      const futureProposalId = Number(await quadraticVoteContract.getProposalCount()) - 1;

      await expect(
        quadraticVoteContract.tallyVotes(futureProposalId)
      ).to.be.revertedWithCustomError(quadraticVoteContract, "VotingNotEnded");
    });
  });

  describe("Reveal Flow", function () {
    let revealProposalId: number;

    before(async function () {
      // Create, vote on, and tally a proposal for reveal testing
      const tx = await quadraticVoteContract.createProposal("Reveal test?", 60);
      await tx.wait();
      revealProposalId = Number(await quadraticVoteContract.getProposalCount()) - 1;

      // Allocate credits to voter2 for this test
      const creditsInput = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, owner.address);
      creditsInput.add64(10n);
      const encryptedCredits = await creditsInput.encrypt();

      await quadraticVoteContract.allocateCredits(
        voter2.address,
        encryptedCredits.handles[0],
        encryptedCredits.inputProof
      );

      const voteInput = hre.fhevm.createEncryptedInput(quadraticVoteContractAddress, voter2.address);
      voteInput.add64(1n);
      const encryptedVote = await voteInput.encrypt();

      await quadraticVoteContract.connect(voter2).castVote(
        revealProposalId,
        true,
        encryptedVote.handles[0],
        encryptedVote.inputProof
      );

      // Advance time and tally
      await time.increase(61);
      await quadraticVoteContract.tallyVotes(revealProposalId);
    });

    it("should request results reveal", async function () {
      const tx = await quadraticVoteContract.requestResultsReveal(revealProposalId);
      await tx.wait();

      const [, , , revealRequested] = await quadraticVoteContract.getProposal(revealProposalId);
      expect(revealRequested).to.be.true;
    });

    it("should get vote handles", async function () {
      const [yesHandle, noHandle] = await quadraticVoteContract.getVoteHandles(revealProposalId);
      expect(yesHandle).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
      expect(noHandle).to.not.eq("0x0000000000000000000000000000000000000000000000000000000000000000");
    });

    it("should reject duplicate reveal request", async function () {
      await expect(
        quadraticVoteContract.requestResultsReveal(revealProposalId)
      ).to.be.revertedWithCustomError(quadraticVoteContract, "RevealAlreadyRequested");
    });
  });
});
