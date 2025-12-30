# Public Decrypt Multiple Values

🟡 **Intermediate** | 🔓 Decryption

How to publicly reveal multiple encrypted values at once using batch 3-step decryption

## Overview

This example demonstrates batch public decryption in FHEVM. Learn how to reveal multiple encrypted values (like lottery numbers or auction bids) at once using a single proof. More efficient than decrypting one value at a time. Shows the complete 3-step flow: batch request, batch off-chain decrypt, and single-proof finalization.

## Quick Start

```bash
# Create new project from this template
npx labz create decryption-public-multiple my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Store Multiple

Store 3 encrypted values with FHE.allowThis() for each. All values will be revealed together in the batch decryption flow.

*Lines 83-105*

### Request Batch

STEP 1: Request public decryption for ALL values at once. Calls FHE.makePubliclyDecryptable() for each encrypted value.

*Lines 109-124*

### Get All Handles

Get all encrypted handles in one call for off-chain batch decryption. STEP 2 uses these handles with relayer-sdk.

*Lines 138-145*

### Finalize Batch

STEP 3: Finalize with single proof that verifies ALL values. One FHE.checkSignatures() call for all values is more efficient than separate calls.

*Lines 156-181*

### Lottery Example

Real-world example: Lottery with 4 encrypted winning numbers. Shows how to batch reveal lottery results fairly.

*Lines 185-244*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.allowThis()`
- `FHE.makePubliclyDecryptable()`
- `FHE.checkSignatures()`

## FHE Types Used

- `euint64`
- `euint32`
- `externalEuint64`
- `externalEuint32`

## Tags

`decryption` `public` `multiple` `batch` `lottery` `auction` `election` `reveal` `makePubliclyDecryptable` `checkSignatures`

## Related Examples

- [decryption-public-single](./decryption-public-single.md)
- [decryption-user-multiple](./decryption-user-multiple.md)
- [lottery](./lottery.md)

## Prerequisites

Before this example, you should understand:
- [decryption-public-single](./decryption-public-single.md)

## Next Steps

After this example, check out:
- [lottery](./lottery.md)
- [auction](./auction.md)
- [voting](./voting.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
