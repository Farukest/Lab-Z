# User Decrypt Multiple Values

🟡 **Intermediate** | 🔓 Decryption

How to privately decrypt multiple encrypted values at once for authorized users

## Overview

This example demonstrates batch private decryption in FHEVM. Learn how to store multiple encrypted values (like a user profile with balance, score, level) and let users decrypt all of them efficiently. Shows how to use FHE.allow() for multiple values, retrieve all handles in one call, and decrypt in batch off-chain.

## Quick Start

```bash
# Create new project from this template
npx labz create decryption-user-multiple my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Create Profile

Store 4 encrypted values (balance, score, level, isPremium) with FHE.allow() for each. All values are encrypted and only the owner can decrypt them.

*Lines 48-90*

### Get All Handles

Return all 4 encrypted handles in one call. User can then decrypt all values off-chain in batch. More efficient than calling 4 separate functions.

*Lines 106-120*

### Game Stats

Another example with 4 encrypted game attributes (health, mana, strength, defense). Shows the pattern works for any type of multi-value data.

*Lines 124-168*

### Share Multiple

Share all encrypted values with another user at once. Grants FHE.allow() for all 4 values to the viewer address.

*Lines 172-184*

### Update Multiple

Update multiple encrypted values atomically. IMPORTANT: New values need new FHE.allow() permissions.

*Lines 202-222*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.add()`
- `FHE.asEbool()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint64`
- `euint32`
- `ebool`
- `externalEuint64`
- `externalEuint32`

## Tags

`decryption` `private` `user` `multiple` `batch` `FHE.allow` `userDecryptEuint` `profile` `game-stats`

## Related Examples

- [decryption-user-single](./decryption-user-single.md)
- [decryption-public-multiple](./decryption-public-multiple.md)
- [encryption-multiple](./encryption-multiple.md)

## Prerequisites

Before this example, you should understand:
- [decryption-user-single](./decryption-user-single.md)
- [encryption-multiple](./encryption-multiple.md)

## Next Steps

After this example, check out:
- [decryption-public-multiple](./decryption-public-multiple.md)
- [acl-transient](./acl-transient.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
