# Encrypt Single Value

🟢 **Beginner** | 🔐 Encryption

How to encrypt and send a single value to a FHEVM contract

## Overview

This fundamental example teaches the complete encryption flow in FHEVM. Learn how clients encrypt values using createEncryptedInput(), send them to contracts as external* types, and how contracts receive and store them using FHE.fromExternal(). This is the foundation for all FHE applications - every encrypted value starts with this flow.

## Quick Start

```bash
# Create new project from this template
npx labz create encryption-single my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Imports

Import both internal types (euint*, ebool) for storage and external types (externalEuint*, externalEbool) for receiving encrypted inputs from clients.

*Lines 1-5*

### Store Uint8

Receive encrypted 8-bit value from client. Client uses add8() to encrypt, contract receives as externalEuint8, converts with FHE.fromExternal(), then sets ACL permissions.

*Lines 38-53*

### Store Uint64

Receive encrypted 64-bit value - the most common type for balances, amounts, and IDs. Client uses add64() with BigInt values (n suffix for large numbers).

*Lines 78-95*

### Store Bool

Receive encrypted boolean. Client uses addBool() to encrypt true/false. Useful for private flags, votes, and conditions.

*Lines 99-115*

### Plaintext Warning

WARNING: FHE.asEuint64() takes a plaintext value that IS VISIBLE on-chain! Only use for initialization with known public values. For private values, always use encrypted input from client.

*Lines 120-140*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.asEuint64()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint8`
- `euint16`
- `euint32`
- `euint64`
- `ebool`
- `externalEuint8`
- `externalEuint16`
- `externalEuint32`
- `externalEuint64`
- `externalEbool`

## Tags

`encryption` `fromExternal` `externalEuint64` `createEncryptedInput` `input` `beginner` `sifreleme`

## Related Examples

- [encryption-multiple](./encryption-multiple.md)
- [decryption-user-single](./decryption-user-single.md)

## Next Steps

After this example, check out:
- [encryption-multiple](./encryption-multiple.md)
- [decryption-user-single](./decryption-user-single.md)
- [input-proofs](./input-proofs.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
