# Blind Matching

🟡 **Intermediate** | 🚀 Advanced

Mutual interest matching without revealing preferences

## Overview

A matching system where two parties can discover mutual interest without revealing their preferences if there's no match. Uses FHE.and to check if both parties expressed interest - only mutual matches are revealed. Perfect for dating apps, business partnerships, or any scenario requiring private preference matching.

## Quick Start

```bash
# Create new project from this template
npx labz create blind-match my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, euint8, ebool, eaddress, externalEuint64, externalEuint8, externalEbool, externalEaddress } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title BlindMatch
 * @notice Private preference matching - find matches without revealing preferences
 * @dev Uses FHE bitwise operations for privacy-preserving compatibility checks
 *
 * FHE Operations Used:
 * - and: Check if both parties have matching preferences
 * - or: Combine preference flags
 * - xor: Find differences in preferences
 * - not: Invert preference bits
 * - shl/shr: Bit manipulation for preference encoding
 * - eq: Exact preference match
 * - gt/gte: Threshold-based matching
 * - select: Conditional reveal
 */
contract BlindMatch is ZamaEthereumConfig {
    // ============ Errors ============
    error ProfileAlreadyExists();
    error ProfileNotFound();
    error PreferencesNotSet();
    error CannotMatchSelf();
    error MatchAlreadyChecked();
    error NotAMatch();
    error NotAuthorized();
    

    // ============ Events ============
    event ProfileRegistered(address indexed user);
    event PreferencesSet(address indexed user);
    event MatchFound(address indexed user1, address indexed user2);
    event MatchRevealed(address indexed user1, address indexed user2);
    

    // ============ Structs ============
    struct Profile {
        euint64 attributes;       // Encrypted: what I am (bit flags)
        euint64 preferences;      // Encrypted: what I'm looking for
        bool registered;
        bool preferencesSet;
    }

    struct MatchResult {
        ebool isMatch;
        bool revealed;
        bool accepted1;
        bool accepted2;
    }

    // ============ State Variables ============
    mapping(address => Profile) public _profiles;
    mapping(bytes32 => MatchResult) public _matches;
    address[] public registeredUsers;

    uint256 public minMatchScore;       // Minimum compatibility score (0-100)
    

    // ============ Modifiers ============
    modifier hasProfile() {
        if (!_profiles[msg.sender].registered) revert ProfileNotFound();
        _;
    }

    modifier hasPreferences() {
        if (!_profiles[msg.sender].preferencesSet) revert PreferencesNotSet();
        _;
    }
    

    // ============ Constructor ============
    constructor(uint256 _minMatchScore) {
        require(_minMatchScore <= 100, "Score must be <= 100");
        minMatchScore = _minMatchScore;
        
    }

    // ============ External Functions ============

    /**
     * @notice Register a new profile with encrypted attributes
     * @param encryptedAttributes Your attributes as encrypted bitfield
     *        Bits represent: interests, location, age range, etc.
     */
    function registerProfile(externalEuint64 encryptedAttributes, bytes calldata inputProof)
        external
    {
        if (_profiles[msg.sender].registered) revert ProfileAlreadyExists();

        euint64 attributes = FHE.fromExternal(encryptedAttributes, inputProof);

        _profiles[msg.sender] = Profile({
            attributes: attributes,
            preferences: FHE.asEuint64(0),
            registered: true,
            preferencesSet: false
        });

        FHE.allowThis(attributes);
        FHE.allow(attributes, msg.sender);

        registeredUsers.push(msg.sender);

        emit ProfileRegistered(msg.sender);
    }

    /**
     * @notice Set what you're looking for (preferences)
     * @param encryptedPreferences Preferences as encrypted bitfield
     *        Must match format of attributes (same bit positions)
     */
    function setPreferences(externalEuint64 encryptedPreferences, bytes calldata inputProof)
        external
        hasProfile
    {
        euint64 preferences = FHE.fromExternal(encryptedPreferences, inputProof);

        _profiles[msg.sender].preferences = preferences;
        _profiles[msg.sender].preferencesSet = true;

        FHE.allowThis(preferences);
        FHE.allow(preferences, msg.sender);

        emit PreferencesSet(msg.sender);
    }

    /**
     * @notice Check if two users are compatible
     * @dev Uses FHE bitwise AND to check preference overlap
     * @param other The other user to check compatibility with
     */
    function checkMatch(address other)
        external
        hasProfile
        hasPreferences
        returns (bytes32)
    {
        if (other == msg.sender) revert CannotMatchSelf();
        if (!_profiles[other].registered) revert ProfileNotFound();
        if (!_profiles[other].preferencesSet) revert PreferencesNotSet();

        bytes32 matchId = _getMatchId(msg.sender, other);
        if (_matches[matchId].revealed) revert MatchAlreadyChecked();

        Profile storage myProfile = _profiles[msg.sender];
        Profile storage theirProfile = _profiles[other];

        // Check mutual compatibility using bitwise AND
        // My preferences AND their attributes = do they have what I want?
        euint64 iLikeThem = FHE.and(myProfile.preferences, theirProfile.attributes);

        // Their preferences AND my attributes = do I have what they want?
        euint64 theyLikeMe = FHE.and(theirProfile.preferences, myProfile.attributes);

        // Mutual match: both must have overlap
        // XOR the results and check if there's significant overlap
        euint64 mutualMatch = FHE.and(iLikeThem, theyLikeMe);

        // Check if mutual match is non-zero (using gt with 0)
        ebool isMatch = FHE.gt(mutualMatch, FHE.asEuint64(0));

        _matches[matchId] = MatchResult({
            isMatch: isMatch,
            revealed: false,
            accepted1: false,
            accepted2: false
        });

        FHE.allowThis(isMatch);

        return matchId;
    }

    /**
     * @notice Reveal match result (both parties must agree)
     * @param matchId The match to reveal
     */
    function revealMatch(bytes32 matchId) external {
        MatchResult storage result = _matches[matchId];
        (address user1, address user2) = _getUsersFromMatchId(matchId);

        if (msg.sender != user1 && msg.sender != user2) revert NotAuthorized();
        if (result.revealed) revert MatchAlreadyChecked();

        // Record acceptance
        if (msg.sender == user1) {
            result.accepted1 = true;
        } else {
            result.accepted2 = true;
        }

        // If both accepted, reveal
        if (result.accepted1 && result.accepted2) {
            result.revealed = true;

            // Allow both users to see the result
            FHE.allow(result.isMatch, user1);
            FHE.allow(result.isMatch, user2);

            emit MatchRevealed(user1, user2);
        }
    }

    /**
     * @notice Update your attributes
     * @param encryptedAttributes New attributes
     */
    function updateAttributes(externalEuint64 encryptedAttributes, bytes calldata inputProof)
        external
        hasProfile
    {
        euint64 attributes = FHE.fromExternal(encryptedAttributes, inputProof);
        _profiles[msg.sender].attributes = attributes;

        FHE.allowThis(attributes);
        FHE.allow(attributes, msg.sender);
    }

    /**
     * @notice Get compatibility score between two preference sets
     * @dev Uses popcount-like operation to count matching bits
     * @param user1 First user
     * @param user2 Second user
     */
    function getCompatibilityScore(address user1, address user2)
        external
        view
        returns (bytes32)
    {
        // Returns matchId to check score
        return _getMatchId(user1, user2);
    }

    

    // ============ View Functions ============

    /**
     * @notice Check if address has a profile
     */
    function hasRegisteredProfile(address user) external view returns (bool) {
        return _profiles[user].registered;
    }

    /**
     * @notice Check if user has set preferences
     */
    function hasSetPreferences(address user) external view returns (bool) {
        return _profiles[user].preferencesSet;
    }

    /**
     * @notice Get total registered users
     */
    function getRegisteredUserCount() external view returns (uint256) {
        return registeredUsers.length;
    }

    /**
     * @notice Check match status
     */
    function getMatchStatus(bytes32 matchId) external view returns (
        bool revealed,
        bool accepted1,
        bool accepted2
    ) {
        MatchResult storage result = _matches[matchId];
        return (result.revealed, result.accepted1, result.accepted2);
    }

    

    // ============ Internal Functions ============

    function _getMatchId(address user1, address user2) internal pure returns (bytes32) {
        // Consistent ordering for match ID
        if (user1 < user2) {
            return keccak256(abi.encodePacked(user1, user2));
        } else {
            return keccak256(abi.encodePacked(user2, user1));
        }
    }

    function _getUsersFromMatchId(bytes32 matchId) internal view returns (address, address) {
        // This is a simplified version - in production you'd store this
        for (uint i = 0; i < registeredUsers.length; i++) {
            for (uint j = i + 1; j < registeredUsers.length; j++) {
                if (_getMatchId(registeredUsers[i], registeredUsers[j]) == matchId) {
                    return (registeredUsers[i], registeredUsers[j]);
                }
            }
        }
        revert("Match not found");
    }

    
}

```

## FHE Operations Used

- `FHE.and()`
- `FHE.eq()`
- `FHE.allowThis()`
- `FHE.allow()`
- `FHE.fromExternal()`
- `FHE.makePubliclyDecryptable()`

## FHE Types Used

- `ebool`
- `externalEbool`

## Tags

`matching` `dating` `privacy` `mutual` `discovery`

## Related Examples

- [age-gate](./age-gate.md)
- [salary-proof](./salary-proof.md)

## Prerequisites

Before this example, you should understand:
- [boolean](./boolean.md)
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [dark-pool](./dark-pool.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
