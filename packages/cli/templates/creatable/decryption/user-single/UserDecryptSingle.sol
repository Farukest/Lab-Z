// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title User Decrypt Single Value - Private decryption for authorized users
/// @notice Demonstrates FHE.allow() for private user decryption
/// @dev Shows how to grant decrypt permission to specific addresses
///
/// KEY CONCEPT: FHE.allow() grants decryption permission
/// - Only addresses with permission can decrypt
/// - Decryption happens OFF-CHAIN using relayer-sdk
/// - The value is never revealed on-chain
///
/// Flow:
/// 1. Contract stores encrypted value
/// 2. Contract calls FHE.allow(value, userAddress)
/// 3. User calls fhevm.userDecryptEuint() off-chain
/// 4. Only that user sees the plaintext value
///
/// This is PRIVATE decryption:
/// - Only the authorized user can see the value
/// - Unlike public decryption, the value is never on-chain
contract UserDecryptSingle is ZamaEthereumConfig {
    // ============ State ============
    mapping(address => euint64) private _balances;
    mapping(address => euint64) private _scores;
    euint64 private _secretNumber;

    // ============ Events ============
    event BalanceUpdated(address indexed user);
    event ScoreUpdated(address indexed user);
    event SecretSet(address indexed setter);
    event PermissionGranted(address indexed owner, address indexed viewer);

    // ============ Store with Self Permission ============

    /// @notice Store a private balance
    /// @dev Only the depositor can decrypt their own balance
    /// @param encryptedAmount The encrypted balance
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function setBalance(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        _balances[msg.sender] = amount;

        // CRITICAL: Set permissions
        FHE.allowThis(amount);           // Contract can use it
        FHE.allow(amount, msg.sender);   // Only sender can decrypt

        emit BalanceUpdated(msg.sender);
    }

    /// @notice Get your own balance (encrypted handle)
    /// @dev Caller can decrypt because FHE.allow was called for them
    /// @return The encrypted balance handle
    ///
    /// Off-chain decryption:
    /// ```typescript
    /// const encryptedBalance = await contract.getMyBalance();
    /// const clearBalance = await fhevm.userDecryptEuint(
    ///   FhevmType.euint64,
    ///   encryptedBalance,
    ///   contractAddress,
    ///   signer,
    /// );
    /// console.log("My balance:", clearBalance);
    /// ```
    function getMyBalance() external view returns (euint64) {
        return _balances[msg.sender];
    }

    // ============ Grant Permission to Others ============

    /// @notice Store a value and grant permission to another user
    /// @dev Owner sets value, but viewer can also decrypt
    /// @param encryptedValue The encrypted value
    /// @param viewer Address that can also decrypt this value
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function setScoreWithViewer(
        externalEuint64 encryptedValue,
        address viewer,
        bytes calldata inputProof
    ) external {
        euint64 score = FHE.fromExternal(encryptedValue, inputProof);

        _scores[msg.sender] = score;

        // Set permissions for multiple addresses
        FHE.allowThis(score);           // Contract can use
        FHE.allow(score, msg.sender);   // Owner can decrypt
        FHE.allow(score, viewer);       // Viewer can ALSO decrypt

        emit ScoreUpdated(msg.sender);
        emit PermissionGranted(msg.sender, viewer);
    }

    /// @notice Get a user's score
    /// @dev Caller must have been granted permission with FHE.allow()
    function getScore(address user) external view returns (euint64) {
        return _scores[user];
    }

    // ============ Permission Check Example ============

    /// @notice Store a secret number that only you can see
    /// @param encryptedSecret The encrypted secret
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function setMySecret(
        externalEuint64 encryptedSecret,
        bytes calldata inputProof
    ) external {
        euint64 secret = FHE.fromExternal(encryptedSecret, inputProof);

        _secretNumber = secret;

        FHE.allowThis(secret);
        FHE.allow(secret, msg.sender);  // ONLY sender has permission

        emit SecretSet(msg.sender);
    }

    /// @notice Get the secret (only works if you set it)
    /// @return The encrypted secret handle
    ///
    /// NOTE: Anyone can call this function and get the handle,
    /// BUT only the user with FHE.allow() permission can decrypt it!
    function getSecret() external view returns (euint64) {
        return _secretNumber;
    }

    // ============ Dynamic Permission Granting ============

    /// @notice Add decrypt permission for your balance to another address
    /// @dev Allows sharing private data with specific parties
    /// @param viewer The address to grant permission to
    function grantBalanceAccess(address viewer) external {
        euint64 balance = _balances[msg.sender];
        require(euint64.unwrap(balance) != 0, "No balance set");

        // Grant permission to new viewer
        FHE.allow(balance, viewer);

        emit PermissionGranted(msg.sender, viewer);
    }

    // ============ Computed Result with Permission ============

    /// @notice Add encrypted value to your balance
    /// @dev Result gets new permissions
    /// @param encryptedAmount Amount to add
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function addToBalance(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 currentBalance = _balances[msg.sender];

        // Compute new balance
        euint64 newBalance = FHE.add(currentBalance, amount);

        // Store new balance
        _balances[msg.sender] = newBalance;

        // IMPORTANT: New encrypted values need new permissions!
        // The result of FHE.add() is a NEW encrypted value
        FHE.allowThis(newBalance);
        FHE.allow(newBalance, msg.sender);

        emit BalanceUpdated(msg.sender);
    }

    /// @notice Check if your balance exceeds a threshold
    /// @dev Returns encrypted boolean that only you can decrypt
    /// @param encryptedThreshold The threshold to compare against
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function isBalanceAbove(
        externalEuint64 encryptedThreshold,
        bytes calldata inputProof
    ) external returns (ebool) {
        euint64 threshold = FHE.fromExternal(encryptedThreshold, inputProof);
        euint64 balance = _balances[msg.sender];

        // Compare: balance > threshold
        ebool result = FHE.gt(balance, threshold);

        // Grant permission to decrypt the boolean result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }
}
