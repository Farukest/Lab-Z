/**
 * Input Proofs Explained - Test Suite
 *
 * This educational test suite explains WHY input proofs exist
 * and HOW they protect FHE applications from attacks.
 */

import { InputProofsExplained, InputProofsExplained__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  attacker: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InputProofsExplained")) as InputProofsExplained__factory;
  const contract = (await factory.deploy()) as InputProofsExplained;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("InputProofsExplained", function () {
  let signers: Signers;
  let contract: InputProofsExplained;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      attacker: ethSigners[3],
    };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("What Are Input Proofs?", function () {
    it("explains input proof basics", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║                    WHAT ARE INPUT PROOFS?                          ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");
      console.log("Input proofs are cryptographic proofs that accompany encrypted values.");
      console.log("They prove that:");
      console.log("");
      console.log("  1. The encrypted value was created by a specific user");
      console.log("  2. The value was encrypted for a specific contract");
      console.log("  3. The encryption was performed correctly");
      console.log("  4. The ciphertext hasn't been tampered with");
      console.log("");
    });
  });

  describe("Why Are Input Proofs Needed?", function () {
    it("demonstrates security without proofs (theoretical attack)", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║              ATTACK SCENARIOS (without proofs)                     ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("ATTACK 1: Malformed Ciphertext");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("Without proof: Attacker submits random bytes as 'encrypted' data");
      console.log("Result: Could crash the FHE computation or produce garbage");
      console.log("With proof: FHE.fromExternal() REVERTS - invalid encryption detected");
      console.log("");

      console.log("ATTACK 2: Replay Attack");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("Without proof: Attacker copies Alice's encrypted deposit");
      console.log("              and submits it as their own");
      console.log("Result: Attacker gets credited for Alice's deposit");
      console.log("With proof: REVERTS - proof shows it was encrypted by Alice,");
      console.log("            not the attacker (msg.sender mismatch)");
      console.log("");

      console.log("ATTACK 3: Cross-Contract Attack");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("Without proof: Attacker takes encrypted value from Contract A");
      console.log("              and uses it in Contract B");
      console.log("Result: Could manipulate Contract B's state");
      console.log("With proof: REVERTS - proof shows value was for Contract A");
      console.log("");
    });

    it("shows correct usage with proofs", async function () {
      console.log("\n=== CORRECT USAGE ===\n");

      const secretValue = 1000n;

      // Step 1: Create encrypted input (includes proof generation)
      console.log("Step 1: Alice creates encrypted input");
      console.log("        fhevm.createEncryptedInput(contractAddr, aliceAddr)");
      console.log("        This generates BOTH the ciphertext AND the proof");

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretValue)
        .encrypt();

      console.log("\nGenerated:");
      console.log("- handles[0]: The encrypted value handle");
      console.log("- inputProof: Embedded in the handle");

      // Step 2: Submit to contract
      console.log("\nStep 2: Alice submits to contract");
      console.log("        FHE.fromExternal() verifies the proof");

      await (await contract
        .connect(signers.alice)
        .storeValue(encryptedInput.handles[0], encryptedInput.inputProof)
      ).wait();

      console.log("\nSuccess! Proof verified:");
      console.log("- Encrypted by: Alice ✓");
      console.log("- Encrypted for: This contract ✓");
      console.log("- Valid encryption: ✓");

      // Verify
      const encrypted = await contract.getStoredValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encrypted,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(secretValue);
      console.log(`\nStored value: ${decrypted}`);
    });
  });

  describe("Proof Verification in FHE.fromExternal()", function () {
    it("explains what FHE.fromExternal() checks", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║            FHE.fromExternal() - Under the Hood                     ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");
      console.log("When you call FHE.fromExternal(encryptedValue), it:");
      console.log("");
      console.log("1. EXTRACTS the ciphertext data");
      console.log("   └─ The actual encrypted bytes");
      console.log("");
      console.log("2. EXTRACTS the proof");
      console.log("   └─ Cryptographic signature + ZK proof");
      console.log("");
      console.log("3. VERIFIES sender identity");
      console.log("   └─ Checks: Was this encrypted by msg.sender?");
      console.log("   └─ If NO → REVERT");
      console.log("");
      console.log("4. VERIFIES contract binding");
      console.log("   └─ Checks: Was this encrypted for address(this)?");
      console.log("   └─ If NO → REVERT");
      console.log("");
      console.log("5. VERIFIES encryption validity");
      console.log("   └─ Checks: Is this a valid TFHE ciphertext?");
      console.log("   └─ If NO → REVERT");
      console.log("");
      console.log("6. RETURNS usable euint64");
      console.log("   └─ Only if ALL checks pass");
      console.log("");
    });
  });

  describe("Financial Security Example", function () {
    it("demonstrates proof protection in token transfers", async function () {
      console.log("\n=== Token Transfer Security ===\n");

      // Alice deposits
      const depositAmount = 100n;

      console.log("1. Alice deposits 100 tokens");
      const depositInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .deposit(depositInput.handles[0], depositInput.inputProof)
      ).wait();

      console.log("   Proof verified: Alice encrypted this deposit");

      // Alice transfers to Bob
      const transferAmount = 30n;

      console.log("\n2. Alice transfers 30 to Bob");
      const transferInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(transferAmount)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .transfer(signers.bob.address, transferInput.handles[0], transferInput.inputProof)
      ).wait();

      console.log("   Proof verified: Alice authorized this transfer amount");

      // Check balances
      const aliceBalance = await contract.getBalance(signers.alice.address);
      const bobBalance = await contract.getBalance(signers.bob.address);

      const aliceClear = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalance,
        contractAddress,
        signers.alice,
      );

      console.log(`\n3. Final balances:`);
      console.log(`   Alice: ${aliceClear} (100 - 30 = 70)`);
      console.log(`   Bob: encrypted (30)`);

      expect(aliceClear).to.eq(70n);
    });
  });

  describe("Client-Side Proof Generation", function () {
    it("shows how proofs are generated client-side", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║            CLIENT-SIDE PROOF GENERATION                            ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");
      console.log("When you call:");
      console.log("");
      console.log("  const input = await fhevm");
      console.log("    .createEncryptedInput(contractAddress, userAddress)");
      console.log("    .add64(secretValue)");
      console.log("    .encrypt();");
      console.log("");
      console.log("The fhevm library does:");
      console.log("");
      console.log("1. Encrypts secretValue using TFHE public key");
      console.log("2. Binds encryption to contractAddress");
      console.log("3. Binds encryption to userAddress");
      console.log("4. Generates ZK proof of correct encryption");
      console.log("5. Signs the proof with user's wallet");
      console.log("6. Packages everything into handles[] array");
      console.log("");
      console.log("The result:");
      console.log("");
      console.log("  input.handles[0]  ← Encrypted value + proof");
      console.log("  input.handles[1]  ← Second value + proof (if added)");
      console.log("  ...               ← More values share same proof batch");
      console.log("");
    });
  });

  describe("Summary", function () {
    it("summarizes input proof concepts", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║                         SUMMARY                                    ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");
      console.log("INPUT PROOFS protect against:");
      console.log("  ✓ Malformed ciphertext attacks");
      console.log("  ✓ Replay attacks (copying others' values)");
      console.log("  ✓ Cross-contract attacks");
      console.log("  ✓ Impersonation attacks");
      console.log("");
      console.log("KEY FUNCTIONS:");
      console.log("  Client: fhevm.createEncryptedInput(contract, user).add*().encrypt()");
      console.log("  Contract: FHE.fromExternal(encryptedValue) ← Verifies proof!");
      console.log("");
      console.log("REMEMBER:");
      console.log("  - Proof is EMBEDDED in the encrypted value handle");
      console.log("  - Verification happens AUTOMATICALLY in fromExternal()");
      console.log("  - Invalid proofs cause transaction REVERT");
      console.log("  - Multiple values in one input share one proof");
      console.log("");
    });
  });
});
