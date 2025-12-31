# User Decrypt Single Value

🟢 **Beginner** | 🔓 Decryption

How to privately decrypt encrypted values for authorized users only

## Overview

This example teaches private (user) decryption in FHEVM. Unlike public decryption where everyone can see the value, user decryption only reveals values to specifically authorized addresses. Learn how to use FHE.allow() to grant decrypt permission, and how users decrypt off-chain using fhevm.userDecryptEuint(). This is essential for private balances, scores, and any sensitive data.

## Quick Start

```bash
# Create new project from this template
npx labz create decryption-user-single my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Set With Permission

Store encrypted value and grant decrypt permission only to the sender. FHE.allow(value, msg.sender) ensures only the sender can decrypt their value off-chain.

*Lines 35-50*

### Get For Decrypt

Return encrypted handle for off-chain decryption. Caller uses fhevm.userDecryptEuint() with their signer to decrypt. Only works if they have FHE.allow() permission.

*Lines 53-69*

### Share With Viewer

Grant decrypt permission to multiple users. Owner and viewer can both decrypt the same encrypted value. Useful for sharing private data with specific parties.

*Lines 73-93*

### Dynamic Grant

Grant permission after initial storage. FHE.allow() can be called any time, allowing dynamic access control. Useful for granting access to new parties later.

*Lines 113-124*

### Computed Result

IMPORTANT: New encrypted values from FHE operations need NEW permissions! The result of FHE.add() is a new encrypted value that requires its own FHE.allow() calls.

*Lines 128-152*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.add()`
- `FHE.gt()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint64`
- `ebool`
- `externalEuint64`

## Tags

`decryption` `private` `user` `FHE.allow` `userDecryptEuint` `off-chain` `permission` `ozel-sifre-cozme`

## Related Examples

- [encryption-single](./encryption-single.md)
- [decryption-user-multiple](./decryption-user-multiple.md)
- [decryption-public-single](./decryption-public-single.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [decryption-user-multiple](./decryption-user-multiple.md)
- [decryption-public-single](./decryption-public-single.md)
- [acl-allow](./acl-allow.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
