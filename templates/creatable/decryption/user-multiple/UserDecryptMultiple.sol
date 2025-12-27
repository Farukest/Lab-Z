// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, euint32, ebool, externalEuint64, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title User Decrypt Multiple Values - Private decryption of multiple encrypted values
/// @notice Demonstrates how to allow users to decrypt multiple values at once
/// @dev Shows batch decryption pattern with FHE.allow() for multiple encrypted types
///
/// KEY CONCEPT: Users can decrypt multiple encrypted values in one flow
/// - Store multiple encrypted values with permissions
/// - User retrieves all handles in one call
/// - User decrypts all values off-chain in batch
/// - More efficient than decrypting one at a time
///
/// Use Cases:
/// - User profile with multiple private fields (balance, score, level)
/// - Game state with hidden attributes (health, mana, inventory count)
/// - Financial dashboard (multiple account balances)
contract UserDecryptMultiple is ZamaEthereumConfig {
    // ============ User Profile Structure ============
    struct EncryptedProfile {
        euint64 balance;
        euint32 score;
        euint32 level;
        ebool isPremium;
        bool initialized;
    }

    // ============ Game Stats Structure ============
    struct EncryptedGameStats {
        euint32 health;
        euint32 mana;
        euint32 strength;
        euint32 defense;
        bool initialized;
    }

    // ============ State ============
    mapping(address => EncryptedProfile) private _profiles;
    mapping(address => EncryptedGameStats) private _gameStats;

    // ============ Events ============
    event ProfileCreated(address indexed user);
    event ProfileUpdated(address indexed user);
    event GameStatsCreated(address indexed user);

    // ============ Profile Functions ============

    /// @notice Create a user profile with multiple encrypted values
    /// @dev All values are stored encrypted and only the owner can decrypt
    /// @param encBalance Encrypted balance (euint64)
    /// @param encScore Encrypted score (euint32)
    /// @param encLevel Encrypted level (euint32)
    /// @param encIsPremium Encrypted premium status (ebool as euint32, 0=false, 1=true)
    /// @param inputProof Zero-knowledge proof for all encrypted inputs
    function createProfile(
        externalEuint64 encBalance,
        externalEuint32 encScore,
        externalEuint32 encLevel,
        externalEuint32 encIsPremium,
        bytes calldata inputProof
    ) external {
        // Convert all external inputs to internal encrypted types
        euint64 balance = FHE.fromExternal(encBalance, inputProof);
        euint32 score = FHE.fromExternal(encScore, inputProof);
        euint32 level = FHE.fromExternal(encLevel, inputProof);
        euint32 premiumValue = FHE.fromExternal(encIsPremium, inputProof);

        // Convert premium to boolean (non-zero = true)
        ebool isPremium = FHE.asEbool(premiumValue);

        // Store in profile
        _profiles[msg.sender] = EncryptedProfile({
            balance: balance,
            score: score,
            level: level,
            isPremium: isPremium,
            initialized: true
        });

        // CRITICAL: Set permissions for ALL encrypted values
        // Contract can use them
        FHE.allowThis(balance);
        FHE.allowThis(score);
        FHE.allowThis(level);
        FHE.allowThis(isPremium);

        // Only sender can decrypt them
        FHE.allow(balance, msg.sender);
        FHE.allow(score, msg.sender);
        FHE.allow(level, msg.sender);
        FHE.allow(isPremium, msg.sender);

        emit ProfileCreated(msg.sender);
    }

    /// @notice Get all profile values as encrypted handles for batch decryption
    /// @dev Returns multiple handles that user can decrypt off-chain in one batch
    /// @return balance Encrypted balance handle
    /// @return score Encrypted score handle
    /// @return level Encrypted level handle
    /// @return isPremium Encrypted premium status handle
    ///
    /// Off-chain batch decryption:
    /// ```typescript
    /// const [balance, score, level, isPremium] = await contract.getMyProfile();
    ///
    /// // Decrypt all at once
    /// const clearBalance = await fhevm.userDecryptEuint(FhevmType.euint64, balance, addr, signer);
    /// const clearScore = await fhevm.userDecryptEuint(FhevmType.euint32, score, addr, signer);
    /// const clearLevel = await fhevm.userDecryptEuint(FhevmType.euint32, level, addr, signer);
    /// const clearPremium = await fhevm.userDecryptEbool(isPremium, addr, signer);
    ///
    /// console.log({ balance: clearBalance, score: clearScore, level: clearLevel, isPremium: clearPremium });
    /// ```
    function getMyProfile() external view returns (
        euint64 balance,
        euint32 score,
        euint32 level,
        ebool isPremium
    ) {
        require(_profiles[msg.sender].initialized, "Profile not created");

        EncryptedProfile storage profile = _profiles[msg.sender];
        return (profile.balance, profile.score, profile.level, profile.isPremium);
    }

    // ============ Game Stats Functions ============

    /// @notice Create game stats with multiple encrypted attributes
    /// @param encHealth Encrypted health points
    /// @param encMana Encrypted mana points
    /// @param encStrength Encrypted strength stat
    /// @param encDefense Encrypted defense stat
    /// @param inputProof Zero-knowledge proof for all inputs
    function createGameStats(
        externalEuint32 encHealth,
        externalEuint32 encMana,
        externalEuint32 encStrength,
        externalEuint32 encDefense,
        bytes calldata inputProof
    ) external {
        euint32 health = FHE.fromExternal(encHealth, inputProof);
        euint32 mana = FHE.fromExternal(encMana, inputProof);
        euint32 strength = FHE.fromExternal(encStrength, inputProof);
        euint32 defense = FHE.fromExternal(encDefense, inputProof);

        _gameStats[msg.sender] = EncryptedGameStats({
            health: health,
            mana: mana,
            strength: strength,
            defense: defense,
            initialized: true
        });

        // Allow contract to use values
        FHE.allowThis(health);
        FHE.allowThis(mana);
        FHE.allowThis(strength);
        FHE.allowThis(defense);

        // Allow user to decrypt all values
        FHE.allow(health, msg.sender);
        FHE.allow(mana, msg.sender);
        FHE.allow(strength, msg.sender);
        FHE.allow(defense, msg.sender);

        emit GameStatsCreated(msg.sender);
    }

    /// @notice Get all game stats as encrypted handles
    /// @return health Encrypted health handle
    /// @return mana Encrypted mana handle
    /// @return strength Encrypted strength handle
    /// @return defense Encrypted defense handle
    function getMyGameStats() external view returns (
        euint32 health,
        euint32 mana,
        euint32 strength,
        euint32 defense
    ) {
        require(_gameStats[msg.sender].initialized, "Stats not created");

        EncryptedGameStats storage stats = _gameStats[msg.sender];
        return (stats.health, stats.mana, stats.strength, stats.defense);
    }

    // ============ Share with Another User ============

    /// @notice Share your profile with another user (they can also decrypt)
    /// @param viewer Address to grant decrypt permission to
    function shareProfileWith(address viewer) external {
        require(_profiles[msg.sender].initialized, "Profile not created");

        EncryptedProfile storage profile = _profiles[msg.sender];

        // Grant permission to viewer for ALL encrypted values
        FHE.allow(profile.balance, viewer);
        FHE.allow(profile.score, viewer);
        FHE.allow(profile.level, viewer);
        FHE.allow(profile.isPremium, viewer);
    }

    /// @notice Get another user's profile (requires permission)
    /// @dev Caller must have been granted permission via shareProfileWith()
    function getProfileOf(address user) external view returns (
        euint64 balance,
        euint32 score,
        euint32 level,
        ebool isPremium
    ) {
        require(_profiles[user].initialized, "Profile not created");

        EncryptedProfile storage profile = _profiles[user];
        return (profile.balance, profile.score, profile.level, profile.isPremium);
    }

    // ============ Update Multiple Values ============

    /// @notice Update profile balance and score together
    /// @dev Demonstrates updating multiple encrypted values atomically
    function updateBalanceAndScore(
        externalEuint64 encBalance,
        externalEuint32 encScore,
        bytes calldata inputProof
    ) external {
        require(_profiles[msg.sender].initialized, "Profile not created");

        euint64 newBalance = FHE.fromExternal(encBalance, inputProof);
        euint32 newScore = FHE.fromExternal(encScore, inputProof);

        _profiles[msg.sender].balance = newBalance;
        _profiles[msg.sender].score = newScore;

        // IMPORTANT: New values need new permissions!
        FHE.allowThis(newBalance);
        FHE.allowThis(newScore);
        FHE.allow(newBalance, msg.sender);
        FHE.allow(newScore, msg.sender);

        emit ProfileUpdated(msg.sender);
    }

    // ============ Computed Values ============

    /// @notice Add to balance and score, return new handles
    /// @dev Shows that computed results also need permissions
    function addToBalanceAndScore(
        externalEuint64 encBalanceAdd,
        externalEuint32 encScoreAdd,
        bytes calldata inputProof
    ) external returns (euint64 newBalance, euint32 newScore) {
        require(_profiles[msg.sender].initialized, "Profile not created");

        euint64 balanceAdd = FHE.fromExternal(encBalanceAdd, inputProof);
        euint32 scoreAdd = FHE.fromExternal(encScoreAdd, inputProof);

        // Compute new values
        newBalance = FHE.add(_profiles[msg.sender].balance, balanceAdd);
        newScore = FHE.add(_profiles[msg.sender].score, scoreAdd);

        // Update storage
        _profiles[msg.sender].balance = newBalance;
        _profiles[msg.sender].score = newScore;

        // Set permissions for NEW computed values
        FHE.allowThis(newBalance);
        FHE.allowThis(newScore);
        FHE.allow(newBalance, msg.sender);
        FHE.allow(newScore, msg.sender);

        emit ProfileUpdated(msg.sender);

        return (newBalance, newScore);
    }

    // ============ Check Initialization ============

    function hasProfile(address user) external view returns (bool) {
        return _profiles[user].initialized;
    }

    function hasGameStats(address user) external view returns (bool) {
        return _gameStats[user].initialized;
    }
}
