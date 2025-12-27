/**
 * Batch Reveal System Test Suite
 *
 * ADVANCED MULTI-PARTY BATCH REVEAL PATTERN
 *
 * This demonstrates a sophisticated batch reveal system that:
 * - Allows multiple participants to submit encrypted entries
 * - Organizer controls the reveal timing
 * - All entries are revealed atomically with a single proof
 * - Supports finding winners and processing results
 *
 * Use Cases:
 * - Sealed-Bid Auction: All bids revealed at once
 * - Tournament: All scores revealed simultaneously
 * - Salary Distribution: Batch reveal of encrypted amounts
 * - Voting: All votes revealed atomically
 *
 * Flow:
 * 1. Organizer creates session
 * 2. Participants submit encrypted entries
 * 3. Organizer closes entries and requests reveal
 * 4. Off-chain: Batch decrypt all entries
 * 5. Finalize with single proof - all entries revealed
 */

import { BatchReveal, BatchReveal__factory } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  organizer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
  dave: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BatchReveal")) as BatchReveal__factory;
  const contract = (await factory.deploy()) as BatchReveal;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("BatchReveal", function () {
  let signers: Signers;
  let contract: BatchReveal;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      organizer: ethSigners[1],
      alice: ethSigners[2],
      bob: ethSigners[3],
      carol: ethSigners[4],
      dave: ethSigners[5],
    };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Session Creation", function () {
    it("should create a new batch reveal session", async function () {
      const description = "Q4 Bonus Distribution";

      const tx = await contract.connect(signers.organizer).createSession(description);
      const receipt = await tx.wait();

      // Get session ID from event
      const sessionId = 0n;

      const [organizer, desc, entriesOpen, revealRequested, revealed, entryCount] =
        await contract.getSessionInfo(sessionId);

      expect(organizer).to.eq(signers.organizer.address);
      expect(desc).to.eq(description);
      expect(entriesOpen).to.eq(true);
      expect(revealRequested).to.eq(false);
      expect(revealed).to.eq(false);
      expect(entryCount).to.eq(0n);

      console.log("Session created:");
      console.log(`  ID: ${sessionId}`);
      console.log(`  Description: ${description}`);
      console.log(`  Organizer: ${organizer}`);
    });

    it("should increment session counter", async function () {
      await contract.connect(signers.organizer).createSession("Session 1");
      await contract.connect(signers.alice).createSession("Session 2");

      expect(await contract.sessionCounter()).to.eq(2n);

      console.log("Multiple sessions created with different organizers");
    });
  });

  describe("Entry Submission", function () {
    let sessionId: bigint;

    beforeEach(async function () {
      await contract.connect(signers.organizer).createSession("Test Session");
      sessionId = 0n;
    });

    it("should allow participants to submit encrypted entries", async function () {
      const aliceValue = 1000n;
      const bobValue = 1500n;

      // Alice submits
      const aliceInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(aliceValue)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, aliceInput.handles[0], aliceInput.inputProof)
      ).wait();

      // Bob submits
      const bobInput = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add64(bobValue)
        .encrypt();

      await (await contract
        .connect(signers.bob)
        .submitEntry(sessionId, bobInput.handles[0], bobInput.inputProof)
      ).wait();

      const entryCount = await contract.getEntryCount(sessionId);
      expect(entryCount).to.eq(2n);

      console.log(`2 entries submitted to session ${sessionId}`);
    });

    it("should submit multiple entries in batch", async function () {
      const values = [100n, 200n, 300n, 400n];

      const batchInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(values[0])
        .add64(values[1])
        .add64(values[2])
        .add64(values[3])
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitBatchEntries(
          sessionId,
          [batchInput.handles[0], batchInput.handles[1], batchInput.handles[2], batchInput.handles[3]],
          batchInput.inputProof
        )
      ).wait();

      const entryCount = await contract.getEntryCount(sessionId);
      expect(entryCount).to.eq(4n);

      console.log("4 entries submitted in single batch transaction");
    });

    it("should reject entries when session is closed", async function () {
      // Submit one entry
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(100n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, input.handles[0], input.inputProof)
      ).wait();

      // Close session
      await (await contract.connect(signers.organizer).closeAndRequestReveal(sessionId)).wait();

      // Try to submit another entry
      const input2 = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add64(200n)
        .encrypt();

      await expect(
        contract.connect(signers.bob).submitEntry(sessionId, input2.handles[0], input2.inputProof)
      ).to.be.revertedWithCustomError(contract, "SessionClosed");

      console.log("Entry submission correctly rejected after session closed");
    });
  });

  describe("Close and Request Reveal", function () {
    let sessionId: bigint;

    beforeEach(async function () {
      await contract.connect(signers.organizer).createSession("Reveal Test");
      sessionId = 0n;
    });

    it("should close entries and request reveal", async function () {
      // Submit entries
      const aliceInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(500n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, aliceInput.handles[0], aliceInput.inputProof)
      ).wait();

      // Close and request reveal
      await (await contract.connect(signers.organizer).closeAndRequestReveal(sessionId)).wait();

      const [, , entriesOpen, revealRequested, revealed] = await contract.getSessionInfo(sessionId);

      expect(entriesOpen).to.eq(false);
      expect(revealRequested).to.eq(true);
      expect(revealed).to.eq(false);

      console.log("Session closed and reveal requested");
      console.log("FHE.makePubliclyDecryptable() called for all entries");
    });

    it("should reject close from non-organizer", async function () {
      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(100n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, input.handles[0], input.inputProof)
      ).wait();

      await expect(
        contract.connect(signers.alice).closeAndRequestReveal(sessionId)
      ).to.be.revertedWithCustomError(contract, "OnlyOrganizer");

      console.log("Non-organizer correctly rejected from closing session");
    });

    it("should reject close on empty session", async function () {
      await expect(
        contract.connect(signers.organizer).closeAndRequestReveal(sessionId)
      ).to.be.revertedWithCustomError(contract, "NoEntries");

      console.log("Empty session correctly rejected from closing");
    });
  });

  describe("Get Session Handles", function () {
    let sessionId: bigint;

    beforeEach(async function () {
      await contract.connect(signers.organizer).createSession("Handle Test");
      sessionId = 0n;

      // Submit entries from multiple participants
      const aliceInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(100n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, aliceInput.handles[0], aliceInput.inputProof)
      ).wait();

      const bobInput = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add64(200n)
        .encrypt();

      await (await contract
        .connect(signers.bob)
        .submitEntry(sessionId, bobInput.handles[0], bobInput.inputProof)
      ).wait();
    });

    it("should return all handles and participants", async function () {
      const { handles, participants } = await contract.getSessionHandles(sessionId);

      expect(handles.length).to.eq(2);
      expect(participants.length).to.eq(2);
      expect(participants[0]).to.eq(signers.alice.address);
      expect(participants[1]).to.eq(signers.bob.address);

      console.log("Retrieved handles for batch decryption:");
      console.log(`  Entry 0: ${participants[0]}`);
      console.log(`  Entry 1: ${participants[1]}`);
    });
  });

  describe("Complete Batch Reveal Flow", function () {
    let sessionId: bigint;
    const aliceValue = 1000n;
    const bobValue = 1500n;
    const carolValue = 800n;

    beforeEach(async function () {
      // Create session
      await contract.connect(signers.organizer).createSession("Complete Flow Test");
      sessionId = 0n;

      // Alice submits
      const aliceInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(aliceValue)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, aliceInput.handles[0], aliceInput.inputProof)
      ).wait();

      // Bob submits
      const bobInput = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add64(bobValue)
        .encrypt();

      await (await contract
        .connect(signers.bob)
        .submitEntry(sessionId, bobInput.handles[0], bobInput.inputProof)
      ).wait();

      // Carol submits
      const carolInput = await fhevm
        .createEncryptedInput(contractAddress, signers.carol.address)
        .add64(carolValue)
        .encrypt();

      await (await contract
        .connect(signers.carol)
        .submitEntry(sessionId, carolInput.handles[0], carolInput.inputProof)
      ).wait();

      // Close and request reveal
      await (await contract.connect(signers.organizer).closeAndRequestReveal(sessionId)).wait();
    });

    it("should complete full batch reveal flow", async function () {
      console.log("\n=== Complete Batch Reveal Flow ===\n");

      // Step 1: Session created and entries submitted (done in beforeEach)
      console.log("Step 1: Session created with 3 encrypted entries");
      console.log("        - Alice, Bob, Carol each submitted encrypted values");

      // Step 2: Get handles for off-chain decryption
      const { handles, participants } = await contract.getSessionHandles(sessionId);
      console.log(`Step 2: Retrieved ${handles.length} handles for batch decryption`);

      // Step 3: Verify state before reveal
      const [, , entriesOpen, revealRequested, revealed] = await contract.getSessionInfo(sessionId);
      expect(entriesOpen).to.eq(false);
      expect(revealRequested).to.eq(true);
      expect(revealed).to.eq(false);
      console.log("Step 3: Entries closed, reveal requested, not yet revealed");

      // Step 4: Documentation of off-chain flow
      console.log("\nStep 4 (Off-chain):");
      console.log("  const result = await fhevm.publicDecrypt(handles);");
      console.log("  const clearValues = handles.map(h => result.clearValues[h]);");
      console.log("  const proof = result.decryptionProof;");
      console.log("  await contract.finalizeBatchReveal(sessionId, clearValues, proof);");

      // Step 5: Note about finalization
      console.log("\nStep 5: After finalizeBatchReveal():");
      console.log("  - All entries revealed atomically");
      console.log("  - Single proof verifies ALL values");
      console.log("  - Winners can be determined");
    });
  });

  describe("Sealed Auction Scenario", function () {
    it("should simulate a sealed-bid auction", async function () {
      console.log("\n=== Sealed-Bid Auction Scenario ===\n");

      // Create auction session
      await contract.connect(signers.organizer).createSession("Art NFT Auction");
      const sessionId = 0n;

      console.log("1. Auction created for 'Art NFT'");

      // Bidders submit sealed bids
      const aliceBid = 5000n;
      const bobBid = 7500n;
      const carolBid = 6000n;
      const daveBid = 8000n;

      const aliceInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(aliceBid)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, aliceInput.handles[0], aliceInput.inputProof)
      ).wait();

      const bobInput = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add64(bobBid)
        .encrypt();

      await (await contract
        .connect(signers.bob)
        .submitEntry(sessionId, bobInput.handles[0], bobInput.inputProof)
      ).wait();

      const carolInput = await fhevm
        .createEncryptedInput(contractAddress, signers.carol.address)
        .add64(carolBid)
        .encrypt();

      await (await contract
        .connect(signers.carol)
        .submitEntry(sessionId, carolInput.handles[0], carolInput.inputProof)
      ).wait();

      const daveInput = await fhevm
        .createEncryptedInput(contractAddress, signers.dave.address)
        .add64(daveBid)
        .encrypt();

      await (await contract
        .connect(signers.dave)
        .submitEntry(sessionId, daveInput.handles[0], daveInput.inputProof)
      ).wait();

      console.log("2. Four bidders submitted sealed bids");
      console.log("   - Alice: ??? (encrypted)");
      console.log("   - Bob: ??? (encrypted)");
      console.log("   - Carol: ??? (encrypted)");
      console.log("   - Dave: ??? (encrypted)");

      // Close bidding
      await (await contract.connect(signers.organizer).closeAndRequestReveal(sessionId)).wait();

      console.log("3. Bidding closed, reveal requested");

      // Get handles for reveal
      const { handles, participants } = await contract.getSessionHandles(sessionId);
      expect(handles.length).to.eq(4);

      console.log("4. Ready for batch reveal:");
      console.log("   - 4 encrypted bids");
      console.log("   - 1 proof will verify all");
      console.log("   - Winner will be determined atomically");
      console.log("");
      console.log("Expected result after reveal:");
      console.log(`   Winner: Dave with bid of ${daveBid}`);
    });
  });

  describe("Error Handling", function () {
    it("should reject finalize without reveal request", async function () {
      await contract.connect(signers.organizer).createSession("Error Test");
      const sessionId = 0n;

      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(100n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, input.handles[0], input.inputProof)
      ).wait();

      // Try to finalize without closing/requesting reveal
      await expect(
        contract.finalizeBatchReveal(sessionId, [100], "0x")
      ).to.be.revertedWithCustomError(contract, "RevealNotRequested");
    });

    it("should reject mismatched clear values length", async function () {
      await contract.connect(signers.organizer).createSession("Length Test");
      const sessionId = 0n;

      const input = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(100n)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .submitEntry(sessionId, input.handles[0], input.inputProof)
      ).wait();

      await (await contract.connect(signers.organizer).closeAndRequestReveal(sessionId)).wait();

      // Try to finalize with wrong number of values
      await expect(
        contract.finalizeBatchReveal(sessionId, [100, 200], "0x")
      ).to.be.revertedWithCustomError(contract, "ArrayLengthMismatch");
    });
  });

  describe("Summary", function () {
    it("summarizes the batch reveal pattern", async function () {
      console.log("\n=== BATCH REVEAL PATTERN SUMMARY ===\n");

      console.log("CREATION:");
      console.log("  await contract.createSession('Session Name');");
      console.log("");

      console.log("ENTRY SUBMISSION:");
      console.log("  // Single entry");
      console.log("  const input = await fhevm.createEncryptedInput(addr, user).add64(value).encrypt();");
      console.log("  await contract.submitEntry(sessionId, input.handles[0], input.inputProof);");
      console.log("");
      console.log("  // Batch submission");
      console.log("  await contract.submitBatchEntries(sessionId, handles[], inputProof);");
      console.log("");

      console.log("CLOSE & REQUEST REVEAL (Organizer only):");
      console.log("  await contract.closeAndRequestReveal(sessionId);");
      console.log("  // Calls FHE.makePubliclyDecryptable() for ALL entries");
      console.log("");

      console.log("OFF-CHAIN BATCH DECRYPTION:");
      console.log("  const { handles } = await contract.getSessionHandles(sessionId);");
      console.log("  const result = await fhevm.publicDecrypt(handles);");
      console.log("  const clearValues = handles.map(h => result.clearValues[h]);");
      console.log("  const proof = result.decryptionProof;");
      console.log("");

      console.log("FINALIZE WITH SINGLE PROOF:");
      console.log("  await contract.finalizeBatchReveal(sessionId, clearValues, proof);");
      console.log("  // ONE proof verifies ALL entries!");
      console.log("");

      console.log("QUERY RESULTS:");
      console.log("  const { participants, values } = await contract.getAllRevealedEntries(sessionId);");
      console.log("  const { winner, winningValue } = await contract.findWinner(sessionId);");
      console.log("");

      console.log("KEY BENEFITS:");
      console.log("  - Dynamic entry count (up to MAX_ENTRIES)");
      console.log("  - Multi-party participation");
      console.log("  - Atomic reveal (all or nothing)");
      console.log("  - Single proof for all entries");
      console.log("  - Built-in winner detection");
    });
  });
});
