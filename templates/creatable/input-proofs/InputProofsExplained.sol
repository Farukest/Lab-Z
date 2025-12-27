// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Input Proofs Explained - Why input proofs exist and how they work
/// @notice Educational contract explaining the security role of input proofs
/// @dev Understanding input proofs is CRITICAL for FHE security
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    WHAT ARE INPUT PROOFS?                          ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  Input proofs are cryptographic proofs that verify:                ║
/// ║                                                                    ║
/// ║  1. The encrypted value was created by an authorized party         ║
/// ║  2. The encryption was performed correctly                         ║
/// ║  3. The encrypted data hasn't been tampered with                   ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    WHY ARE THEY NEEDED?                            ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  WITHOUT proofs, an attacker could:                                ║
/// ║                                                                    ║
/// ║  1. Submit malformed ciphertexts that break computations           ║
/// ║  2. Copy someone else's encrypted values                           ║
/// ║  3. Replay old encrypted values in new contexts                    ║
/// ║  4. Create values that decrypt to unexpected results               ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    HOW THEY WORK                                   ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  Client-side (fhevm library):                                      ║
/// ║  1. User provides plaintext value                                  ║
/// ║  2. fhevm encrypts with contract address + user address            ║
/// ║  3. Generates ZK proof of correct encryption                       ║
/// ║  4. Returns: { handles: [...], inputProof: "0x..." }               ║
/// ║                                                                    ║
/// ║  Contract-side (FHE.fromExternal):                                 ║
/// ║  1. Receives external encrypted type + proof                       ║
/// ║  2. Verifies proof matches contract + sender                       ║
/// ║  3. If valid, returns usable encrypted value                       ║
/// ║  4. If invalid, transaction reverts                                ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
contract InputProofsExplained is ZamaEthereumConfig {
    // ============ State ============
    euint64 private _storedValue;
    mapping(address => euint64) private _balances;

    // ============ Events ============
    event ValueStored(address indexed user);
    event TransferAttempted(address indexed from, address indexed to);

    // ============ Basic Input Proof Example ============

    /// @notice Store a value - proof is verified automatically
    /// @param encryptedValue Encrypted value handle
    /// @param inputProof ZK proof that encryption was done correctly
    ///
    /// The proof verification happens INSIDE FHE.fromExternal():
    /// - Checks that sender encrypted this value
    /// - Checks that value was encrypted for THIS contract
    /// - Checks encryption was performed correctly
    ///
    /// If any check fails, the transaction REVERTS
    function storeValue(
        externalEuint64 encryptedValue,
        bytes calldata inputProof
    ) external {
        // FHE.fromExternal() does THREE things:
        // 1. Extracts the ciphertext
        // 2. Verifies the input proof
        // 3. Returns a usable euint64
        //
        // If proof is invalid -> REVERT
        _storedValue = FHE.fromExternal(encryptedValue, inputProof);

        FHE.allowThis(_storedValue);
        FHE.allow(_storedValue, msg.sender);

        emit ValueStored(msg.sender);
    }

    // ============ Security Demonstration ============

    /// @notice Deposit tokens with proof
    /// @dev Shows why proof is needed for financial operations
    /// @param amount Encrypted deposit amount
    /// @param inputProof ZK proof validating the encryption
    function deposit(
        externalEuint64 amount,
        bytes calldata inputProof
    ) external {
        // Without proof verification, an attacker could:
        // 1. Submit random bytes that "decrypt" to huge numbers
        // 2. Copy another user's encrypted deposit
        // 3. Replay old deposits

        // FHE.fromExternal verifies:
        // - This value was encrypted by msg.sender
        // - This value was encrypted for THIS contract
        euint64 validAmount = FHE.fromExternal(amount, inputProof);

        // Now safe to use in calculations
        _balances[msg.sender] = FHE.add(_balances[msg.sender], validAmount);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
    }

    /// @notice Transfer tokens - recipient's encrypted amount needs proof too!
    /// @param to Recipient address
    /// @param amount Encrypted transfer amount
    /// @param inputProof ZK proof validating the encryption
    function transfer(
        address to,
        externalEuint64 amount,
        bytes calldata inputProof
    ) external {
        euint64 validAmount = FHE.fromExternal(amount, inputProof);

        // The proof guarantees:
        // - msg.sender encrypted this amount
        // - Amount was specifically for this contract
        // - No one can replay someone else's transfer amount

        // Safe transfer logic
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], validAmount);
        _balances[to] = FHE.add(_balances[to], validAmount);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[to], to);

        emit TransferAttempted(msg.sender, to);
    }

    // ============ View Functions ============

    function getStoredValue() external view returns (euint64) {
        return _storedValue;
    }

    function getBalance(address user) external view returns (euint64) {
        return _balances[user];
    }
}
