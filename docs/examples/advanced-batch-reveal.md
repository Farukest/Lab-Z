# Batch Reveal System

🔴 **Advanced** | 🚀 Advanced

Advanced multi-party batch reveal system with dynamic entries, session management, and single-proof verification

## Overview

This advanced example demonstrates a sophisticated batch reveal system for multi-party scenarios. Features include: dynamic entry storage (up to 20 entries), session-based organization with designated organizer, batch submission of multiple entries, atomic reveal of all entries with a single proof, and built-in winner detection. Perfect for sealed-bid auctions, tournaments, salary distributions, and voting systems.

## Quick Start

```bash
# Create new project from this template
npx labz create advanced-batch-reveal my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Create Session

Create a new batch reveal session. The creator becomes the organizer who controls when entries close and reveal happens.

*Lines 77-92*

### Submit Entry

Participants submit encrypted entries to the session. Each entry is stored with FHE.allowThis() for later reveal.

*Lines 98-124*

### Submit Batch

Submit multiple entries in a single transaction. Useful for batch operations like importing data or testing.

*Lines 130-156*

### Close Request

Organizer closes entries and requests reveal. Calls FHE.makePubliclyDecryptable() for ALL entries at once.

*Lines 162-184*

### Get Handles

Get all encrypted handles and participant addresses for off-chain batch decryption with relayer-sdk.

*Lines 198-218*

### Finalize Batch

Finalize with a single proof that verifies ALL entries. One FHE.checkSignatures() call for all values is highly efficient.

*Lines 224-264*

### Find Winner

Helper function to find the winner (highest value) among all revealed entries. Useful for auctions and competitions.

*Lines 294-314*

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

`batch` `reveal` `multi-party` `session` `auction` `tournament` `voting` `lottery` `threshold` `organizer` `entries`

## Related Examples

- [decryption-public-multiple](./decryption-public-multiple.md)
- [auction](./auction.md)
- [lottery](./lottery.md)
- [voting](./voting.md)
- [sealed-tender](./sealed-tender.md)

## Prerequisites

Before this example, you should understand:
- [decryption-public-single](./decryption-public-single.md)
- [decryption-public-multiple](./decryption-public-multiple.md)

## Next Steps

After this example, check out:
- [auction](./auction.md)
- [voting](./voting.md)
- [lottery](./lottery.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
