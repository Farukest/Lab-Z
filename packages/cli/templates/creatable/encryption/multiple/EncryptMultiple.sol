// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypt Multiple Values - Send multiple encrypted values in one transaction
/// @notice Demonstrates efficient batch encryption with shared input proof
/// @dev Shows how to chain .add*() calls to encrypt multiple values together
///
/// KEY INSIGHT: Multiple values share ONE proof!
/// - More efficient than separate transactions
/// - Lower gas cost per value
/// - All values encrypted together atomically
///
/// Client-side pattern:
/// ```typescript
/// const input = await fhevm
///   .createEncryptedInput(contractAddress, userAddress)
///   .add64(value1)    // handles[0]
///   .add64(value2)    // handles[1]
///   .addBool(flag)    // handles[2]
///   .encrypt();
///
/// await contract.method(
///   input.handles[0],
///   input.handles[1],
///   input.handles[2],
///   input.inputProof  // Single proof for all values!
/// );
/// ```
contract EncryptMultiple is ZamaEthereumConfig {
    // ============ Encrypted Storage ============
    euint64 private _balance;
    euint64 private _limit;
    ebool private _isActive;

    // For batch operations
    euint64 private _valueA;
    euint64 private _valueB;
    euint64 private _valueC;

    // For point/coordinate storage
    euint64 private _x;
    euint64 private _y;
    euint64 private _z;

    // ============ Events ============
    event MultipleValuesStored(address indexed user, uint256 count);
    event CoordinatesStored(address indexed user);
    event TransferParamsSet(address indexed user);

    // ============ Two Values ============

    /// @notice Store two encrypted values with shared proof
    /// @dev More efficient than two separate calls
    /// @param encryptedA First encrypted value
    /// @param encryptedB Second encrypted value
    /// @param inputProof Shared zero-knowledge proof for both inputs
    ///
    /// Client-side:
    /// ```typescript
    /// const input = await fhevm
    ///   .createEncryptedInput(contractAddress, userAddress)
    ///   .add64(100)  // value A
    ///   .add64(200)  // value B
    ///   .encrypt();
    /// await contract.storeTwoValues(
    ///   input.handles[0],
    ///   input.handles[1],
    ///   input.inputProof
    /// );
    /// ```
    function storeTwoValues(
        externalEuint64 encryptedA,
        externalEuint64 encryptedB,
        bytes calldata inputProof
    ) external {
        // Convert both values from external to internal
        _valueA = FHE.fromExternal(encryptedA, inputProof);
        _valueB = FHE.fromExternal(encryptedB, inputProof);

        // Set permissions for both
        FHE.allowThis(_valueA);
        FHE.allowThis(_valueB);
        FHE.allow(_valueA, msg.sender);
        FHE.allow(_valueB, msg.sender);

        emit MultipleValuesStored(msg.sender, 2);
    }

    // ============ Three Values ============

    /// @notice Store three encrypted values
    /// @param a First value
    /// @param b Second value
    /// @param c Third value
    /// @param inputProof Shared zero-knowledge proof for all inputs
    function storeThreeValues(
        externalEuint64 a,
        externalEuint64 b,
        externalEuint64 c,
        bytes calldata inputProof
    ) external {
        _valueA = FHE.fromExternal(a, inputProof);
        _valueB = FHE.fromExternal(b, inputProof);
        _valueC = FHE.fromExternal(c, inputProof);

        // Set permissions for all three
        FHE.allowThis(_valueA);
        FHE.allowThis(_valueB);
        FHE.allowThis(_valueC);

        FHE.allow(_valueA, msg.sender);
        FHE.allow(_valueB, msg.sender);
        FHE.allow(_valueC, msg.sender);

        emit MultipleValuesStored(msg.sender, 3);
    }

    // ============ Mixed Types ============

    /// @notice Store mixed encrypted types (integers + boolean)
    /// @dev Shows that different types can share the same input proof
    /// @param balance Encrypted balance (64-bit)
    /// @param limit Encrypted limit (64-bit)
    /// @param isActive Encrypted active flag (boolean)
    /// @param inputProof Shared zero-knowledge proof for all inputs
    ///
    /// Client-side:
    /// ```typescript
    /// const input = await fhevm
    ///   .createEncryptedInput(contractAddress, userAddress)
    ///   .add64(1000n)    // balance
    ///   .add64(5000n)    // limit
    ///   .addBool(true)   // isActive
    ///   .encrypt();
    /// await contract.storeAccountData(
    ///   input.handles[0],
    ///   input.handles[1],
    ///   input.handles[2],
    ///   input.inputProof
    /// );
    /// ```
    function storeAccountData(
        externalEuint64 balance,
        externalEuint64 limit,
        externalEbool isActive,
        bytes calldata inputProof
    ) external {
        _balance = FHE.fromExternal(balance, inputProof);
        _limit = FHE.fromExternal(limit, inputProof);
        _isActive = FHE.fromExternal(isActive, inputProof);

        // Permissions for all
        FHE.allowThis(_balance);
        FHE.allowThis(_limit);
        FHE.allowThis(_isActive);

        FHE.allow(_balance, msg.sender);
        FHE.allow(_limit, msg.sender);
        FHE.allow(_isActive, msg.sender);

        emit MultipleValuesStored(msg.sender, 3);
    }

    // ============ 3D Coordinates Example ============

    /// @notice Store encrypted 3D coordinates
    /// @dev Useful for games, private location data, etc.
    /// @param x X coordinate
    /// @param y Y coordinate
    /// @param z Z coordinate
    /// @param inputProof Shared zero-knowledge proof for all inputs
    function storeCoordinates(
        externalEuint64 x,
        externalEuint64 y,
        externalEuint64 z,
        bytes calldata inputProof
    ) external {
        _x = FHE.fromExternal(x, inputProof);
        _y = FHE.fromExternal(y, inputProof);
        _z = FHE.fromExternal(z, inputProof);

        FHE.allowThis(_x);
        FHE.allowThis(_y);
        FHE.allowThis(_z);

        FHE.allow(_x, msg.sender);
        FHE.allow(_y, msg.sender);
        FHE.allow(_z, msg.sender);

        emit CoordinatesStored(msg.sender);
    }

    // ============ Operate on Multiple Values ============

    /// @notice Add all three stored values together
    /// @return The encrypted sum
    function sumThreeValues() external returns (euint64) {
        // Add A + B + C
        euint64 sum = FHE.add(FHE.add(_valueA, _valueB), _valueC);

        FHE.allowThis(sum);
        FHE.allow(sum, msg.sender);

        return sum;
    }

    /// @notice Calculate distance squared from origin
    /// @dev Distance = sqrt(x^2 + y^2 + z^2), but we return squared to avoid sqrt
    function distanceSquared() external returns (euint64) {
        // x^2 + y^2 + z^2
        euint64 x2 = FHE.mul(_x, _x);
        euint64 y2 = FHE.mul(_y, _y);
        euint64 z2 = FHE.mul(_z, _z);

        euint64 dist2 = FHE.add(FHE.add(x2, y2), z2);

        FHE.allowThis(dist2);
        FHE.allow(dist2, msg.sender);

        return dist2;
    }

    /// @notice Check if balance is within limit and account is active
    /// @return Encrypted boolean: true if valid
    function isValidAccount() external returns (ebool) {
        // balance <= limit AND isActive
        ebool withinLimit = FHE.le(_balance, _limit);
        ebool result = FHE.and(withinLimit, _isActive);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }

    // ============ View Functions ============

    function getValueA() external view returns (euint64) { return _valueA; }
    function getValueB() external view returns (euint64) { return _valueB; }
    function getValueC() external view returns (euint64) { return _valueC; }

    function getBalance() external view returns (euint64) { return _balance; }
    function getLimit() external view returns (euint64) { return _limit; }
    function getIsActive() external view returns (ebool) { return _isActive; }

    function getX() external view returns (euint64) { return _x; }
    function getY() external view returns (euint64) { return _y; }
    function getZ() external view returns (euint64) { return _z; }
}
