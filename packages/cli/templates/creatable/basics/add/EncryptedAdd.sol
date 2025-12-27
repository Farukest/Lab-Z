// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Addition - Add two encrypted values
/// @notice Demonstrates the most basic FHE arithmetic operation
contract EncryptedAdd is ZamaEthereumConfig {
    /// @dev Stores the last computed result
    euint64 private _result;

    /// @notice Add two encrypted 64-bit values
    /// @param a First encrypted value
    /// @param b Second encrypted value
    /// @param inputProof Combined proof for both inputs
    /// @return The encrypted sum (handle)
    function add(
        externalEuint64 a,
        externalEuint64 b,
        bytes calldata inputProof
    ) external returns (euint64) {
        // Convert external inputs to internal encrypted values
        euint64 encryptedA = FHE.fromExternal(a, inputProof);
        euint64 encryptedB = FHE.fromExternal(b, inputProof);

        // Perform encrypted addition
        // Neither a, b, nor the result are ever visible!
        _result = FHE.add(encryptedA, encryptedB);

        // Set permissions
        FHE.allowThis(_result);        // Contract can use this value
        FHE.allow(_result, msg.sender); // Caller can decrypt

        return _result;
    }

    /// @notice Get the last computed result
    function getResult() external view returns (euint64) {
        return _result;
    }
}
