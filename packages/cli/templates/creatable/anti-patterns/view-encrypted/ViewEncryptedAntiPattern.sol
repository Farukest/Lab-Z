// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title View Encrypted Anti-Pattern - Common mistake with view functions
/// @notice Demonstrates why returning encrypted values from view functions doesn't work
/// @dev This is one of the MOST COMMON mistakes when learning FHEVM
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    THE MISTAKE                                     ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  Developer thinks:                                                 ║
/// ║  "I'll just read the encrypted value from a view function         ║
/// ║   and decrypt it client-side"                                      ║
/// ║                                                                    ║
/// ║  function getBalance() public view returns (euint64) {             ║
/// ║      return _balance;  // Returns encrypted handle                 ║
/// ║  }                                                                 ║
/// ║                                                                    ║
/// ║  // Client tries:                                                  ║
/// ║  const balance = await contract.getBalance();                      ║
/// ║  // Gets: 0x... (just the handle, NOT the plaintext!)              ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    WHY IT DOESN'T WORK                             ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  1. View functions return the encrypted HANDLE, not the value      ║
/// ║  2. The handle is a 32-byte reference to encrypted data            ║
/// ║  3. Decryption requires:                                           ║
/// ║     - Permission check (FHE.allow was called)                      ║
/// ║     - User signature (proves identity)                             ║
/// ║     - Off-chain decryption via relayer-sdk                         ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
///
/// ╔═══════════════════════════════════════════════════════════════════╗
/// ║                    THE CORRECT APPROACH                            ║
/// ╠═══════════════════════════════════════════════════════════════════╣
/// ║                                                                    ║
/// ║  1. Grant permission: FHE.allow(value, userAddress)                ║
/// ║  2. Return handle: function getBalance() returns (euint64)         ║
/// ║  3. Decrypt off-chain:                                             ║
/// ║     const clear = await fhevm.userDecryptEuint(                    ║
/// ║       FhevmType.euint64,                                           ║
/// ║       encryptedHandle,                                             ║
/// ║       contractAddress,                                             ║
/// ║       signer  // User signs to prove identity                      ║
/// ║     );                                                             ║
/// ║                                                                    ║
/// ╚═══════════════════════════════════════════════════════════════════╝
contract ViewEncryptedAntiPattern is ZamaEthereumConfig {
    // ============ State ============
    mapping(address => euint64) private _balances;

    event BalanceSet(address indexed user);

    // ============ Set Balance ============

    /// @notice Store an encrypted balance
    /// @param amount Encrypted amount
    /// @param inputProof ZK proof for the encrypted input
    function setBalance(
        externalEuint64 amount,
        bytes calldata inputProof
    ) external {
        euint64 balance = FHE.fromExternal(amount, inputProof);
        _balances[msg.sender] = balance;

        FHE.allowThis(balance);
        FHE.allow(balance, msg.sender);

        emit BalanceSet(msg.sender);
    }

    // ============ ANTI-PATTERN: Expecting plaintext from view ============

    /// @notice Returns encrypted handle (NOT plaintext!)
    /// @dev ANTI-PATTERN: Developers often expect this to return plaintext
    ///
    /// WRONG thinking:
    /// ```javascript
    /// const balance = await contract.getBalanceAntiPattern();
    /// console.log("My balance:", balance);
    /// // Prints: 0x... (encrypted handle, NOT the actual balance!)
    /// ```
    ///
    /// The returned value is a 32-byte handle that references
    /// encrypted data on the blockchain. It is NOT the plaintext value!
    function getBalanceAntiPattern() external view returns (euint64) {
        return _balances[msg.sender];
        // This returns a HANDLE, not a readable value!
    }

    // ============ CORRECT: Return handle, decrypt off-chain ============

    /// @notice Returns encrypted handle for off-chain decryption
    /// @dev CORRECT: Use fhevm.userDecryptEuint() on client-side
    ///
    /// CORRECT usage:
    /// ```javascript
    /// // Step 1: Get the encrypted handle
    /// const encryptedBalance = await contract.getBalanceCorrect();
    ///
    /// // Step 2: Decrypt off-chain with user signature
    /// const plainBalance = await fhevm.userDecryptEuint(
    ///   FhevmType.euint64,
    ///   encryptedBalance,
    ///   contractAddress,
    ///   signer  // User proves identity
    /// );
    ///
    /// console.log("My balance:", plainBalance);
    /// // Prints: 1000n (the actual balance!)
    /// ```
    function getBalanceCorrect() external view returns (euint64) {
        return _balances[msg.sender];
        // Returns handle - caller must decrypt off-chain
    }

    // ============ ANOTHER ANTI-PATTERN: Trying to cast to uint ============

    // THE FOLLOWING WOULD NOT COMPILE (commented out to show the mistake)
    //
    // function getBalanceAsUint() external view returns (uint64) {
    //     return uint64(_balances[msg.sender]);
    //     // ERROR: Cannot convert euint64 to uint64!
    //     // The encrypted value cannot be "read" on-chain
    // }

    // ============ ANOTHER ANTI-PATTERN: Trying to decrypt in view ============

    // THE FOLLOWING IS IMPOSSIBLE (commented out to show the mistake)
    //
    // function decryptAndReturn() external view returns (uint64) {
    //     return FHE.decrypt(_balances[msg.sender]);
    //     // ERROR: There is no FHE.decrypt() function!
    //     // Decryption must happen off-chain
    // }
}
