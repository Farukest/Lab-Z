// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ACL Demo - Access Control for Encrypted Values
/// @notice Shows how to manage permissions for encrypted data
/// @dev Demonstrates allow, allowThis, allowTransient, and isAllowed
contract ACLDemo is ZamaEthereumConfig {
    /// @dev The encrypted secret value
    euint32 private _secret;

    /// @dev Who set the secret (has admin rights)
    address public secretOwner;

    /// @notice Set a new encrypted secret
    /// @param encryptedSecret The encrypted value
    /// @param inputProof Proof of valid encryption
    function setSecret(externalEuint32 encryptedSecret, bytes calldata inputProof) external {
        _secret = FHE.fromExternal(encryptedSecret, inputProof);
        secretOwner = msg.sender;

        // CRITICAL: Allow the contract to use this value in future operations
        // Without this, any future operation on _secret would fail!
        FHE.allowThis(_secret);

        // Allow the setter to decrypt their own secret
        FHE.allow(_secret, msg.sender);
    }

    /// @notice Grant permanent access to another address
    /// @param recipient The address to grant access to
    /// @dev Only the secret owner can share access
    function shareAccess(address recipient) external {
        require(msg.sender == secretOwner, "Only owner can share");

        // Grant persistent access - recipient can decrypt anytime
        FHE.allow(_secret, recipient);
    }

    /// @notice Grant temporary access (current transaction only)
    /// @param recipient The address to grant temporary access to
    /// @dev Useful for one-time operations like transfers
    function shareTransientAccess(address recipient) external {
        require(msg.sender == secretOwner, "Only owner can share");

        // Grant transient access - only valid for this transaction
        FHE.allowTransient(_secret, recipient);
    }

    /// @notice Check if an address has access to the secret
    /// @param account The address to check
    /// @return True if the address has access
    function hasAccess(address account) external view returns (bool) {
        return FHE.isAllowed(_secret, account);
    }

    /// @notice Check if the caller has access
    /// @return True if msg.sender has access
    function canIAccess() external view returns (bool) {
        return FHE.isSenderAllowed(_secret);
    }

    /// @notice Get the encrypted secret (handle only)
    /// @return The encrypted secret handle
    function getSecret() external view returns (euint32) {
        return _secret;
    }
}
