/**
 * View Encrypted Anti-Pattern - Test Suite
 *
 * This is one of the MOST COMMON mistakes when learning FHEVM!
 *
 * THE MISTAKE:
 * Developers expect view functions to return plaintext values,
 * but they only return encrypted handles that must be decrypted off-chain.
 */

import { ViewEncryptedAntiPattern, ViewEncryptedAntiPattern__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ViewEncryptedAntiPattern")) as ViewEncryptedAntiPattern__factory;
  const contract = (await factory.deploy()) as ViewEncryptedAntiPattern;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ViewEncryptedAntiPattern", function () {
  let signers: { deployer: HardhatEthersSigner; alice: HardhatEthersSigner };
  let contract: ViewEncryptedAntiPattern;
  let contractAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async () => {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("The Anti-Pattern Explained", function () {
    it("shows the common mistake", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║              ANTI-PATTERN: View Returns Encrypted                  ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("THE MISTAKE developers make:");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("");
      console.log("// Contract code:");
      console.log("function getBalance() public view returns (euint64) {");
      console.log("    return _balance;");
      console.log("}");
      console.log("");
      console.log("// Developer's WRONG expectation:");
      console.log("const balance = await contract.getBalance();");
      console.log("console.log('Balance:', balance);");
      console.log("// Expected: 1000");
      console.log("// Actual: 0x1234abcd... (encrypted handle!)");
      console.log("");
    });
  });

  describe("Demonstrating the Anti-Pattern", function () {
    it("shows that view returns handle, not plaintext", async function () {
      const secretBalance = 1000n;

      // Set a balance
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretBalance)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBalance(encryptedInput.handles[0])
      ).wait();

      // ANTI-PATTERN: Just calling the view function
      const antiPatternResult = await contract
        .connect(signers.alice)
        .getBalanceAntiPattern();

      console.log("\nANTI-PATTERN result:");
      console.log("───────────────────────────────────────────────");
      console.log("Returned value:", antiPatternResult.toString());
      console.log("");
      console.log("This is NOT 1000!");
      console.log("It's an encrypted handle (bytes32 reference)");
      console.log("You CANNOT read this directly!");
    });
  });

  describe("The Correct Approach", function () {
    it("shows how to properly decrypt off-chain", async function () {
      const secretBalance = 1000n;

      // Set a balance
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(secretBalance)
        .encrypt();

      await (await contract
        .connect(signers.alice)
        .setBalance(encryptedInput.handles[0])
      ).wait();

      console.log("\nCORRECT approach:");
      console.log("───────────────────────────────────────────────");

      // Step 1: Get the encrypted handle
      console.log("Step 1: Get encrypted handle from contract");
      const encryptedBalance = await contract
        .connect(signers.alice)
        .getBalanceCorrect();
      console.log("        Handle:", encryptedBalance.toString().slice(0, 20) + "...");

      // Step 2: Decrypt off-chain with user signature
      console.log("\nStep 2: Decrypt off-chain with user signature");
      console.log("        await fhevm.userDecryptEuint(...)");

      const plainBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      console.log("\nStep 3: Use the plaintext value");
      console.log(`        Balance: ${plainBalance}`);

      expect(plainBalance).to.eq(secretBalance);
    });
  });

  describe("Why This Happens", function () {
    it("explains why encrypted values can't be read directly", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║              WHY CAN'T WE READ ENCRYPTED VALUES?                   ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("1. SECURITY");
      console.log("   If anyone could read encrypted values, they wouldn't be encrypted!");
      console.log("");

      console.log("2. PERMISSION MODEL");
      console.log("   FHE.allow() grants specific addresses decrypt permission.");
      console.log("   The blockchain itself doesn't have permission to decrypt.");
      console.log("");

      console.log("3. DECRYPTION REQUIRES PROOF");
      console.log("   User must sign a request proving their identity.");
      console.log("   This signature is verified before decryption.");
      console.log("");

      console.log("4. OFF-CHAIN PROCESSING");
      console.log("   Decryption happens via Zama's Key Management Service.");
      console.log("   The KMS checks permissions and returns plaintext to authorized users.");
      console.log("");
    });
  });

  describe("Common Variations of This Mistake", function () {
    it("lists other variations developers try", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║              OTHER COMMON MISTAKES                                 ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("MISTAKE 1: Trying to cast to uint");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("function getBadBalance() returns (uint64) {");
      console.log("    return uint64(_balance);  // COMPILE ERROR!");
      console.log("}");
      console.log("");

      console.log("MISTAKE 2: Trying to use non-existent decrypt()");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("function getBadBalance() returns (uint64) {");
      console.log("    return FHE.decrypt(_balance);  // NO SUCH FUNCTION!");
      console.log("}");
      console.log("");

      console.log("MISTAKE 3: Comparing encrypted to plaintext");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("function isRich() returns (bool) {");
      console.log("    return _balance > 1000;  // COMPILE ERROR!");
      console.log("}");
      console.log("// Should use: FHE.gt(_balance, FHE.asEuint64(1000))");
      console.log("");

      console.log("MISTAKE 4: Logging encrypted values");
      console.log("─────────────────────────────────────────────────────────────────────");
      console.log("emit BalanceUpdated(address, _balance);  // Just logs handle!");
      console.log("// The event will contain the handle, not the actual balance");
      console.log("");
    });
  });

  describe("Summary", function () {
    it("summarizes the correct pattern", async function () {
      console.log("\n");
      console.log("╔═══════════════════════════════════════════════════════════════════╗");
      console.log("║                    CORRECT PATTERN                                 ║");
      console.log("╚═══════════════════════════════════════════════════════════════════╝");
      console.log("");

      console.log("CONTRACT-SIDE:");
      console.log("1. Store encrypted value: _balance = FHE.fromExternal(input);");
      console.log("2. Grant permission: FHE.allow(_balance, msg.sender);");
      console.log("3. Return handle: function getBalance() returns (euint64);");
      console.log("");

      console.log("CLIENT-SIDE:");
      console.log("1. Get handle: const encrypted = await contract.getBalance();");
      console.log("2. Decrypt off-chain:");
      console.log("   const plain = await fhevm.userDecryptEuint(");
      console.log("     FhevmType.euint64,");
      console.log("     encrypted,");
      console.log("     contractAddress,");
      console.log("     signer  // Proves identity");
      console.log("   );");
      console.log("3. Use plaintext: console.log('Balance:', plain);");
      console.log("");
    });
  });
});
