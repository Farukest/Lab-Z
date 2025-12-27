// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Counter - A simple encrypted counter
/// @notice Demonstrates basic FHEVM operations: encrypted state, add, sub, and ACL
contract FHECounter is ZamaEthereumConfig {
    /// @dev The encrypted counter value - stored as euint32
    euint32 private _count;

    /// @notice Returns the encrypted counter handle
    /// @dev Returns bytes32(0) if counter is uninitialized
    function getCount() external view returns (euint32) {
        return _count;
    }

    /// @notice Increments the counter by an encrypted value
    /// @param inputEuint32 The encrypted value to add (from client-side encryption)
    /// @param inputProof Zero-knowledge proof validating the encrypted input
    function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        // Convert external encrypted input to usable euint32
        euint32 evalue = FHE.fromExternal(inputEuint32, inputProof);

        // Perform encrypted addition
        _count = FHE.add(_count, evalue);

        // Grant permissions for the new encrypted value
        FHE.allowThis(_count);        // Allow contract to use this value
        FHE.allow(_count, msg.sender); // Allow caller to decrypt off-chain
    }

    /// @notice Decrements the counter by an encrypted value
    /// @param inputEuint32 The encrypted value to subtract (from client-side encryption)
    /// @param inputProof Zero-knowledge proof validating the encrypted input
    /// @dev No underflow check - for production, implement proper range validation
    function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        // Convert external encrypted input to usable euint32
        euint32 evalue = FHE.fromExternal(inputEuint32, inputProof);

        // Perform encrypted subtraction
        _count = FHE.sub(_count, evalue);

        // Grant permissions for the new encrypted value
        FHE.allowThis(_count);        // Allow contract to use this value
        FHE.allow(_count, msg.sender); // Allow caller to decrypt off-chain
    }
}
