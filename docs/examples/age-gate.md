# Age Gate

🟢 **Beginner** | 🚀 Advanced

Age verification without revealing exact birth date

## Overview

Proves someone is over a certain age without revealing their actual birth date. Uses FHE.gte for encrypted age comparison - the contract only learns if the user is above the threshold, nothing more. Essential pattern for privacy-preserving identity verification.

## Quick Start

```bash
# Create new project from this template
npx labz create age-gate my-project

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
 * @title AgeGate
 * @notice Age verification without revealing birth date
 * @dev Proves age >= threshold without exposing exact date of birth
 *
 * Use Cases:
 * - Adult content access (18+)
 * - Alcohol/tobacco purchases (21+)
 * - Senior discounts (65+)
 * - Age-restricted gaming
 *
 * FHE Operations Used:
 * - sub: Calculate age from current time - birth date
 * - div: Convert seconds to years
 * - gte/gt: Check if age meets requirement
 * - and/or: Combine multiple conditions
 * - select: Conditional access
 */
contract AgeGate is ZamaEthereumConfig {
    // ============ Errors ============
    error BirthDateAlreadyRegistered();
    error BirthDateNotRegistered();
    error NotAuthorizedIssuer();
    error InvalidAgeRequirement();
    error VerificationExpired();
    error AlreadyVerified();
    

    // ============ Events ============
    event BirthDateRegistered(address indexed user, address indexed issuer);
    event AgeVerified(address indexed user, address indexed verifier, uint256 minAge);
    event AccessGranted(address indexed user, bytes32 indexed resourceId);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    

    // ============ Structs ============
    struct Identity {
        euint64 birthDate;         // Encrypted Unix timestamp
        address issuer;                  // Who attested this
        uint256 registeredAt;
        bool active;
    }

    struct Verification {
        address user;
        address verifier;
        uint256 minAge;
        ebool meetsRequirement;          // Encrypted result
        uint256 createdAt;
        uint256 expiresAt;
    }

    // ============ Constants ============
    uint256 public constant SECONDS_PER_YEAR = 31536000; // 365 days

    // ============ State Variables ============
    mapping(address => Identity) public _birthDates;
    mapping(bytes32 => Verification) public _verifications;
    mapping(address => bool) public _issuers;

    uint256 public verificationValidityPeriod;
    

    // ============ Modifiers ============
    modifier onlyIssuer() {
        if (!_issuers[msg.sender]) revert NotAuthorizedIssuer();
        _;
    }

    modifier hasBirthDate() {
        if (!_birthDates[msg.sender].active) revert BirthDateNotRegistered();
        _;
    }
    

    // ============ Constructor ============
    constructor(uint256 _validityPeriod) {
        verificationValidityPeriod = _validityPeriod;
        _issuers[msg.sender] = true;
        
    }

    // ============ External Functions ============

    /**
     * @notice Register encrypted birth date (issuer only)
     * @param user The user's address
     * @param encryptedBirthDate Encrypted Unix timestamp of birth date
     */
    function registerBirthDate(
        address user,
        externalEuint64 encryptedBirthDate, bytes calldata inputProof
    ) external onlyIssuer {
        if (_birthDates[user].active) revert BirthDateAlreadyRegistered();

        euint64 birthDate = FHE.fromExternal(encryptedBirthDate, inputProof);

        _birthDates[user] = Identity({
            birthDate: birthDate,
            issuer: msg.sender,
            registeredAt: block.timestamp,
            active: true
        });

        // Allow contract and user to use the encrypted date
        FHE.allowThis(birthDate);
        FHE.allow(birthDate, user);

        emit BirthDateRegistered(user, msg.sender);
    }

    /**
     * @notice Verify age meets minimum requirement
     * @param minAge Minimum age in years (e.g., 18, 21, 65)
     * @param verifier Who needs to verify (e.g., a service)
     */
    function verifyAge(uint256 minAge, address verifier)
        external
        hasBirthDate
        returns (bytes32)
    {
        if (minAge == 0 || minAge > 150) revert InvalidAgeRequirement();

        euint64 birthDate = _birthDates[msg.sender].birthDate;

        // Calculate age: (currentTime - birthDate) / secondsPerYear
        euint64 currentTime = FHE.asEuint64(uint64(block.timestamp));
        euint64 ageInSeconds = FHE.sub(currentTime, birthDate);
        euint64 ageInYears = FHE.div(ageInSeconds, uint64(SECONDS_PER_YEAR));

        // Check if age >= minAge
        ebool meetsRequirement = FHE.ge(ageInYears, FHE.asEuint64(uint64(minAge)));

        bytes32 verificationId = keccak256(abi.encodePacked(
            msg.sender,
            verifier,
            minAge,
            block.timestamp
        ));

        _verifications[verificationId] = Verification({
            user: msg.sender,
            verifier: verifier,
            minAge: minAge,
            meetsRequirement: meetsRequirement,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + verificationValidityPeriod
        });

        FHE.allowThis(meetsRequirement);
        // Verifier can check result via checkAgeRequirement

        emit AgeVerified(msg.sender, verifier, minAge);
        return verificationId;
    }

    /**
     * @notice Check if a verification meets the requirement
     * @param verificationId The verification to check
     */
    function checkAgeRequirement(bytes32 verificationId)
        external
        returns (ebool)
    {
        Verification storage v = _verifications[verificationId];
        require(v.verifier == msg.sender, "Not verifier");
        if (block.timestamp > v.expiresAt) revert VerificationExpired();

        // Allow verifier to see the result
        FHE.allow(v.meetsRequirement, msg.sender);

        return v.meetsRequirement;
    }

    /**
     * @notice Grant access to a resource based on age verification
     * @param resourceId The resource identifier
     * @param minAge Required minimum age
     */
    function grantAccess(bytes32 resourceId, uint256 minAge)
        external
        hasBirthDate
        returns (ebool)
    {
        euint64 birthDate = _birthDates[msg.sender].birthDate;
        euint64 currentTime = FHE.asEuint64(uint64(block.timestamp));
        euint64 ageInSeconds = FHE.sub(currentTime, birthDate);
        euint64 ageInYears = FHE.div(ageInSeconds, uint64(SECONDS_PER_YEAR));

        ebool hasAccess = FHE.ge(ageInYears, FHE.asEuint64(uint64(minAge)));

        FHE.allow(hasAccess, msg.sender);
        FHE.allowThis(hasAccess);

        emit AccessGranted(msg.sender, resourceId);
        return hasAccess;
    }

    /**
     * @notice Add authorized issuer
     */
    function addIssuer(address issuer) external onlyIssuer {
        _issuers[issuer] = true;
        emit IssuerAdded(issuer);
    }

    /**
     * @notice Remove issuer
     */
    function removeIssuer(address issuer) external onlyIssuer {
        _issuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    

    // ============ View Functions ============

    /**
     * @notice Check if user has registered birth date
     */
    function hasBirthDateRegistered(address user) external view returns (bool) {
        return _birthDates[user].active;
    }

    /**
     * @notice Get identity info (not the birth date)
     */
    function getIdentity(address user) external view returns (
        address issuer,
        uint256 registeredAt,
        bool active
    ) {
        Identity storage id = _birthDates[user];
        return (id.issuer, id.registeredAt, id.active);
    }

    /**
     * @notice Get verification info
     */
    function getVerification(bytes32 verificationId) external view returns (
        address user,
        address verifier,
        uint256 minAge,
        uint256 expiresAt
    ) {
        Verification storage v = _verifications[verificationId];
        return (v.user, v.verifier, v.minAge, v.expiresAt);
    }

    /**
     * @notice Check if address is authorized issuer
     */
    function isIssuer(address addr) external view returns (bool) {
        return _issuers[addr];
    }

    

    // ============ Internal Functions ============
    
}

```

## FHE Operations Used

- `FHE.gte()`
- `FHE.gt()`
- `FHE.sub()`
- `FHE.allowThis()`
- `FHE.allow()`
- `FHE.fromExternal()`

## FHE Types Used

- `euint64`
- `externalEuint64`
- `ebool`

## Tags

`identity` `verification` `age` `privacy` `compliance`

## Related Examples

- [salary-proof](./salary-proof.md)
- [blind-match](./blind-match.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [salary-proof](./salary-proof.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
