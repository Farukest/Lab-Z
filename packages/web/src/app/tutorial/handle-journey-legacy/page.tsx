"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { InteractiveTutorial } from "@/components/interactive-tutorial";
import { handleJourneyTutorial } from "@/tutorials";
import { ArrowLeft, BookOpen, Copy, Download, Check } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

// Static template info (non-translated parts)
const TEMPLATE_INFO_STATIC = {
  name: "Handle Journey",
  difficulty: "beginner" as const,
  tags: ["handles", "lifecycle", "birth", "permission", "operation", "decryption", "educational"],
};

const DIFFICULTY_COLORS = {
  beginner: "var(--success)",
  intermediate: "var(--warning)",
  advanced: "var(--error)",
};

// Test code for Handle Journey
const TEST_CODE = `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { reencryptEuint64 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { HandleJourney } from "../../typechain-types";

describe("Handle Journey - Handle Lifecycle", function () {
  let contract: HandleJourney;
  let contractAddress: string;

  before(async function () {
    await initSigners();
    const signers = await getSigners();

    const factory = await ethers.getContractFactory("HandleJourney");
    contract = await factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  describe("Stage 1: Handle is Born (Birth)", function () {
    it("creating handle from plaintext", async function () {
      // 1. Handle is born: FHE.asEuint64(42) is called
      const secretValue = 42n;
      const tx = await contract.stage1_birthFromPlaintext(secretValue);
      await tx.wait();

      // Handle now lives in the contract
      const handle = await contract.getStoredHandle();
      expect(handle).to.not.equal(0n);
    });

    it("creating handle from encrypted input", async function () {
      const signers = await getSigners();
      const fhevm = await createInstance();

      // Client-side encryption
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100n);
      const encryptedAmount = await input.encrypt();

      // Handle is born: FHE.fromExternal(input, proof)
      const tx = await contract.stage1_birthFromEncrypted(
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
      await tx.wait();
    });
  });

  describe("Stage 2: Handle Gets Permission (Permission)", function () {
    it("granting permanent permission (FHE.allow)", async function () {
      // Grant permanent access to the handle
      const tx = await contract.stage2_grantPermanentPermission();
      await tx.wait();

      // Permission granted, this address can now use the handle
      const signers = await getSigners();
      // ACL check...
    });

    it("granting transient permission (FHE.allowTransient)", async function () {
      const signers = await getSigners();

      // Transient permission: valid only for this transaction
      const tx = await contract.stage2_grantTransientPermission(signers.bob.address);
      await tx.wait();

      // Permission is automatically removed when transaction ends
    });
  });

  describe("Stage 3: Handle is Used (Operation)", function () {
    it("two handles are added", async function () {
      // Add two handles together
      const tx = await contract.stage3_operationAdd();
      await tx.wait();

      // Result is a NEW handle!
      // result = FHE.add(handleA, handleB)
      const resultHandle = await contract.getStoredHandle();
      expect(resultHandle).to.not.equal(0n);
    });

    it("handles are compared", async function () {
      // Compare handles - result is ebool!
      const tx = await contract.stage3_operationCompare();
      await tx.wait();
    });

    it("conditional selection is performed", async function () {
      // FHE.select(condition, ifTrue, ifFalse)
      const tx = await contract.stage3_operationSelect();
      await tx.wait();
    });
  });

  describe("Stage 4: Handle is Stored (Storage)", function () {
    it("operation result is saved", async function () {
      // First perform an operation
      await contract.stage3_operationAdd();

      // Save the result to state
      const tx = await contract.stage4_storeOperationResult();
      await tx.wait();

      // Handle is now in storage!
      const storedHandle = await contract.getStoredHandle();
      expect(storedHandle).to.not.equal(0n);
    });

    it("handle is transferred", async function () {
      const signers = await getSigners();

      // Handle is moved to another variable/mapping
      const tx = await contract.stage4_transferHandle(signers.bob.address);
      await tx.wait();
    });
  });

  describe("Stage 5: Handle Dies (Death/Decryption)", function () {
    it("handle is decrypted - async", async function () {
      // First create a handle
      await contract.stage1_birthFromPlaintext(42n);

      // Send decrypt request (async!)
      const tx = await contract.stage5_requestDecryption();
      await tx.wait();

      // Wait for Gateway callback...
      // In production this takes time
    });

    it("decrypt result is retrieved", async function () {
      const signers = await getSigners();
      const fhevm = await createInstance();

      // Get the handle
      const handle = await contract.getHandleForDecryption();

      // Read value via reencrypt (client-side)
      const decryptedValue = await reencryptEuint64(
        signers.alice,
        fhevm,
        handle,
        contractAddress
      );

      // Handle "died" - now there's plaintext
      console.log("Decrypted value:", decryptedValue);
    });
  });
});`;

// Contract code for Handle Journey
const CONTRACT_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title HandleJourney
 * @notice Educational contract demonstrating handle lifecycle
 *
 * Handle Lifecycle:
 * 1. BIRTH: Handle is created
 *    - FHE.asEuint64(plaintext) - from plaintext
 *    - FHE.fromExternal(input, proof) - from encrypted input
 *
 * 2. PERMISSION: Access is granted to handle
 *    - FHE.allow(handle, address) - permanent permission
 *    - FHE.allowTransient(handle, address) - transient permission
 *
 * 3. OPERATION: FHE operations on handles
 *    - FHE.add, FHE.sub, FHE.mul - arithmetic
 *    - FHE.lt, FHE.eq, FHE.gt - comparison
 *    - FHE.select - conditional selection
 *
 * 4. STORAGE: Handle is stored in state
 *    - Stored in mapping or state variable
 *    - Can be transferred to other handles
 *
 * 5. DEATH: Handle is decrypted (3-Step Async Pattern)
 *    - FHE.makePubliclyDecryptable() - marks for decrypt
 *    - Off-chain publicDecrypt() for decryption
 *    - FHE.checkSignatures() to finalize
 */
contract HandleJourney is ZamaEthereumConfig {
    // ============ State Variables ============

    /// @notice Main encrypted value handle
    euint64 private storedHandle;

    /// @notice Second handle (for operations)
    euint64 private secondHandle;

    /// @notice Operation result
    euint64 private resultHandle;

    /// @notice Comparison result (boolean)
    ebool private comparisonResult;

    /// @notice User balances (handles)
    mapping(address => euint64) private balances;

    /// @notice Decrypted value
    uint64 public decryptedValue;

    /// @notice Is decryption pending?
    bool public decryptionPending;

    // ============ Events ============

    event HandleBorn(string birthType);
    event PermissionGranted(address indexed to, bool permanent);
    event OperationPerformed(string operation);
    event HandleStored();
    event DecryptionRequested(uint256 requestId);
    event DecryptionCompleted(uint64 value);

    // ============ Constructor ============

    constructor() {
        // Gateway callback preparation
    }

    // ============ Stage 1: Birth ============

    /**
     * @notice Creates handle from plaintext
     * @dev FHE.asEuint64(value) - value is encrypted on-chain
     * @param value Plaintext value to encrypt
     *
     * Handle is "born" here:
     * - Plaintext (42) → FHE.asEuint64 → Handle (encrypted reference)
     * - Handle now points to encrypted data in the coprocessor
     */
    function stage1_birthFromPlaintext(uint64 value) external {
        // Handle is born! Plaintext → encrypted handle
        storedHandle = FHE.asEuint64(value);

        emit HandleBorn("plaintext");
    }

    /**
     * @notice Creates handle from encrypted input
     * @dev FHE.fromExternal(input, proof) - client-side encrypted
     * @param encryptedInput Encrypted input handle
     * @param inputProof ZK proof
     *
     * In this method:
     * - Encryption was done CLIENT-side
     * - Only encrypted data is sent to chain
     * - Proof validates correctness
     */
    function stage1_birthFromEncrypted(
        externalEuint64 encryptedInput,
        bytes calldata inputProof
    ) external {
        // Handle is born! Encrypted input → handle
        storedHandle = FHE.fromExternal(encryptedInput, inputProof);

        // Grant permission to contract
        FHE.allowThis(storedHandle);

        emit HandleBorn("encrypted_input");
    }

    // ============ Stage 2: Permission ============

    /**
     * @notice Grants permanent access to handle
     * @dev FHE.allow(handle, address) - permanent ACL entry
     *
     * Permanent permission:
     * - Written to blockchain state
     * - Valid until revoked
     * - Has gas cost (storage write)
     */
    function stage2_grantPermanentPermission() external {
        // Grant permanent access to handle
        FHE.allow(storedHandle, msg.sender);

        // Also grant permission to contract itself
        FHE.allow(storedHandle, address(this));

        emit PermissionGranted(msg.sender, true);
    }

    /**
     * @notice Grants transient access to handle
     * @dev FHE.allowTransient(handle, address) - only for this tx
     * @param to Address to grant permission
     *
     * Transient permission:
     * - Automatically removed when transaction ends
     * - Gas savings (no storage write)
     * - Ideal for cross-contract calls
     */
    function stage2_grantTransientPermission(address to) external {
        // Transient permission - only for this transaction
        FHE.allowTransient(storedHandle, to);

        emit PermissionGranted(to, false);
    }

    // ============ Stage 3: Operation ============

    /**
     * @notice Adds two handles
     * @dev FHE.add(a, b) → returns new handle
     *
     * Operation result:
     * - A new handle is created
     * - Original handles remain unchanged
     * - Result handle also needs permission
     */
    function stage3_operationAdd() external {
        // Create a second handle
        secondHandle = FHE.asEuint64(10);

        // Add two handles - RESULT IS A NEW HANDLE!
        resultHandle = FHE.add(storedHandle, secondHandle);

        // Grant permission to result handle
        FHE.allow(resultHandle, address(this));
        FHE.allow(resultHandle, msg.sender);

        emit OperationPerformed("add");
    }

    /**
     * @notice Compares handles
     * @dev FHE.lt(a, b) → returns ebool
     *
     * Comparison:
     * - Result is encrypted boolean (ebool)
     * - ebool is also a handle!
     * - Can be used with FHE.select
     */
    function stage3_operationCompare() external {
        secondHandle = FHE.asEuint64(50);

        // Compare: storedHandle < 50 ?
        comparisonResult = FHE.lt(storedHandle, secondHandle);

        // Grant permission to ebool
        FHE.allow(comparisonResult, address(this));

        emit OperationPerformed("compare");
    }

    /**
     * @notice Performs conditional selection
     * @dev FHE.select(condition, ifTrue, ifFalse)
     *
     * Select:
     * - Like encrypted if-else
     * - Which value is selected remains SECRET
     * - Very powerful privacy primitive
     */
    function stage3_operationSelect() external {
        euint64 optionA = FHE.asEuint64(100);
        euint64 optionB = FHE.asEuint64(200);

        // Select based on condition - which is selected is UNKNOWN!
        resultHandle = FHE.select(comparisonResult, optionA, optionB);

        FHE.allow(resultHandle, address(this));

        emit OperationPerformed("select");
    }

    // ============ Stage 4: Storage ============

    /**
     * @notice Stores operation result permanently
     * @dev Handle → state variable
     *
     * Storage:
     * - Handle is assigned to another state variable
     * - Gas cost: handle reference is written (256 bit)
     * - Encrypted data stays in coprocessor
     */
    function stage4_storeOperationResult() external {
        // Save result to main handle
        storedHandle = resultHandle;

        emit HandleStored();
    }

    /**
     * @notice Transfers handle to another address
     * @dev Transfer via mapping
     * @param to Target address
     *
     * Transfer:
     * - Handle is written to another mapping entry
     * - Permissions must be updated too!
     */
    function stage4_transferHandle(address to) external {
        // Transfer handle
        balances[to] = storedHandle;

        // Grant permission to new owner
        FHE.allow(storedHandle, to);

        emit HandleStored();
    }

    // ============ Stage 5: Death (Decrypt - 3-Step Async) ============

    /**
     * @notice STEP 1: Requests handle decryption
     * @dev FHE.makePubliclyDecryptable() - 3-step async pattern
     *
     * 3-STEP ASYNC DECRYPTION:
     * 1. ON-CHAIN: makePubliclyDecryptable() is called
     * 2. OFF-CHAIN: publicDecrypt() gets value and proof
     * 3. ON-CHAIN: checkSignatures() finalizes
     */
    function stage5_requestDecryption() external {
        // STEP 1: Mark handle for public decrypt
        FHE.makePubliclyDecryptable(storedHandle);

        decryptionPending = true;
        emit DecryptionRequested(0);
    }

    /**
     * @notice STEP 2 HELPER: Returns handle for decrypt
     * @dev Used for off-chain publicDecrypt([handle])
     */
    function getHandleForDecryption() external view returns (bytes32) {
        return euint64.unwrap(storedHandle);
    }

    /**
     * @notice STEP 3: Finalizes decrypt result
     * @dev FHE.checkSignatures() validates proof
     * @param clearValue Decrypted value
     * @param decryptionProof Proof from KMS
     *
     * Handle "dies" here:
     * - Encrypted value → converted to plaintext
     * - Everyone can now see it
     * - Privacy is lost
     */
    function stage5_finalizeDecryption(
        uint64 clearValue,
        bytes calldata decryptionProof
    ) external {
        // Create ciphertext array
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = euint64.unwrap(storedHandle);

        // Create cleartext bytes
        bytes memory cleartexts = abi.encode(clearValue);

        // Validate proof
        FHE.checkSignatures(cts, cleartexts, decryptionProof);

        // Handle "died" - value is now public
        decryptedValue = clearValue;
        decryptionPending = false;

        emit DecryptionCompleted(clearValue);
    }

    // ============ View Functions ============

    /**
     * @notice Returns stored handle
     */
    function getStoredHandle() external view returns (euint64) {
        return storedHandle;
    }

    /**
     * @notice Returns balance of an address
     */
    function getBalance(address account) external view returns (euint64) {
        return balances[account];
    }
}`;

export default function HandleJourneyTutorialPage() {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const { t } = useTranslation();

  // Build sections from translations
  const sections = useMemo(() => [
    { id: "birth", title: t.handleJourney.sections.birth.title, description: t.handleJourney.sections.birth.description },
    { id: "permission", title: t.handleJourney.sections.permission.title, description: t.handleJourney.sections.permission.description },
    { id: "operation", title: t.handleJourney.sections.operation.title, description: t.handleJourney.sections.operation.description },
    { id: "storage", title: t.handleJourney.sections.storage.title, description: t.handleJourney.sections.storage.description },
    { id: "death", title: t.handleJourney.sections.death.title, description: t.handleJourney.sections.death.description },
  ], [t]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyContract = async () => {
    await navigator.clipboard.writeText(CONTRACT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText("npx labz create handle-journey my-handle-journey-app");
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleDownload = async () => {
    const response = await fetch("/api/download/handle-journey");
    if (!response.ok) {
      console.error("Download failed");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "handle-journey-project.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          {t.common.loading}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Template Header */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '9px 16px' }}>
          {/* Top row: Back link + Language Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--fg-muted)',
                textDecoration: 'none',
                fontSize: '12px',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <ArrowLeft style={{ width: '14px', height: '14px' }} />
              {t.common.back}
            </Link>
            <LanguageSwitcher variant="compact" />
          </div>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <BookOpen style={{ width: '24px', height: '24px', color: 'var(--accent)' }} />
            <h1 style={{
              fontSize: '24px',
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              margin: 0,
            }}>
              {TEMPLATE_INFO_STATIC.name}
            </h1>
            <span style={{
              padding: '4px 10px',
              background: DIFFICULTY_COLORS[TEMPLATE_INFO_STATIC.difficulty],
              color: '#000',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase',
            }}>
              {TEMPLATE_INFO_STATIC.difficulty}
            </span>
          </div>

          {/* Description */}
          <p style={{
            color: 'var(--fg-muted)',
            fontSize: '14px',
            marginBottom: '16px',
            maxWidth: '600px',
          }}>
            Complete lifecycle of an FHE handle from birth to death
          </p>

          {/* Tags */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {TEMPLATE_INFO_STATIC.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '4px 8px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  fontSize: '11px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--fg-muted)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Sections - Translated */}
          <div style={{
            display: 'flex',
            gap: '2px',
            background: 'var(--border)',
            padding: '1px',
            marginBottom: '16px',
          }}>
            {sections.map((section, idx) => {
              const isActive = idx === activeSection;
              return (
                <div
                  key={section.id}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'var(--bg)',
                    textAlign: 'center',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: '4px',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}>
                    {idx + 1}. {section.title}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: 'all 0.15s ease',
                  }}>
                    {section.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CLI Command */}
          <div
            className="code-block"
            style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--success)' }}>$</span>
              <code style={{ color: 'var(--fg)' }}>npx labz create handle-journey my-handle-journey-app</code>
            </div>
            <button
              onClick={handleCopyCommand}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--fg-muted)',
              }}
              title="Copy command"
            >
              {copiedCmd ? (
                <Check style={{ width: '14px', height: '14px', color: 'var(--success)' }} />
              ) : (
                <Copy style={{ width: '14px', height: '14px' }} />
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCopyContract} className="btn" style={{ padding: '6px 12px' }}>
              {copied ? (
                <Check style={{ width: '12px', height: '12px', color: 'var(--success)' }} />
              ) : (
                <Copy style={{ width: '12px', height: '12px' }} />
              )}
              <span style={{ fontSize: '11px' }}>{copied ? t.common.copied : t.common.copyContract}</span>
            </button>
            <button onClick={handleDownload} className="btn btn-primary" style={{ padding: '6px 12px' }}>
              <Download style={{ width: '12px', height: '12px' }} />
              <span style={{ fontSize: '11px' }}>{t.common.download}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial */}
      <main style={{ flex: 1, maxWidth: '1600px', margin: '0 auto', padding: '9px 16px', width: '100%' }}>
        <InteractiveTutorial
          testCode={TEST_CODE}
          contractCode={CONTRACT_CODE}
          tutorial={handleJourneyTutorial}
          templateName="Handle Journey"
        />
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: '60px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        padding: '24px 16px 40px',
      }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date().getFullYear()} // Built for{' '}
              <a href="https://www.zama.ai/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Zama
              </a>{' '}
              Bounty
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href="https://x.com/0xflydev" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}>
              @0xflydev
            </a>
            <a href="https://github.com/Farukest" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}>
              GitHub
            </a>
            <a href="https://stackoverflow.com/users/3583237/farukest" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}>
              StackOverflow
            </a>
            <a href="https://docs.zama.ai/fhevm" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}>
              fhEVM Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
