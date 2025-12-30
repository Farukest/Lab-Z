# Public Decrypt Single Value

🟡 **Intermediate** | 🔓 Decryption

3-step async public decryption: the CURRENT pattern for revealing encrypted values to everyone

## Overview

This CRITICAL example teaches the 3-step async public decryption pattern in FHEVM. The old Gateway/Oracle callback pattern has been REMOVED. Learn how to: (1) request reveal with FHE.makePubliclyDecryptable(), (2) decrypt off-chain with relayer-sdk publicDecrypt(), and (3) finalize with FHE.checkSignatures(). Use this when you need to reveal values publicly like lottery results, auction winners, or voting tallies.

## Quick Start

```bash
# Create new project from this template
npx labz create decryption-public-single my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Step1 Request

STEP 1: Call FHE.makePubliclyDecryptable() to mark the encrypted value for public decryption. This enables off-chain services to decrypt it.

*Lines 73-92*

### Step2 Handle

STEP 2 (off-chain): Return the encrypted handle for off-chain decryption. Client uses fhevmInstance.publicDecrypt([handle]) to get clearValue and proof.

*Lines 94-109*

### Step3 Finalize

STEP 3: Finalize with proof from KMS. FHE.checkSignatures() verifies the proof is valid. If valid, the decrypted value is stored on-chain publicly.

*Lines 111-155*

### Proof Verification

Build ciphertext and cleartext arrays for verification. FHE.checkSignatures() takes three params: ciphertext handles, encoded cleartexts, and the proof from KMS.

*Lines 138-148*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.makePubliclyDecryptable()`
- `FHE.checkSignatures()`
- `FHE.allowThis()`

## FHE Types Used

- `euint64`
- `externalEuint64`

## Tags

`decryption` `public` `makePubliclyDecryptable` `checkSignatures` `async` `3-step` `reveal` `KMS` `proof`

## Related Examples

- [decryption-user-single](./decryption-user-single.md)
- [decryption-public-multiple](./decryption-public-multiple.md)
- [lottery](./lottery.md)
- [auction](./auction.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)
- [decryption-user-single](./decryption-user-single.md)

## Next Steps

After this example, check out:
- [decryption-public-multiple](./decryption-public-multiple.md)
- [lottery](./lottery.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
