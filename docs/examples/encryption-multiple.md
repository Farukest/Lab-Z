# Encrypt Multiple Values

🟢 **Beginner** | 🔐 Encryption

How to encrypt and send multiple values in a single transaction

## Overview

This example teaches efficient batch encryption in FHEVM. Instead of encrypting values separately, chain multiple .add*() calls to create a single encrypted input with shared proof. This reduces gas costs, ensures atomicity, and improves efficiency. Learn how to encrypt mixed types (integers + booleans) together and access them via handles array.

## Quick Start

```bash
# Create new project from this template
npx labz create encryption-multiple my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Two Values

Store two encrypted values from a single encrypted input. Client uses .add64(a).add64(b).encrypt() and contract receives both via handles[0] and handles[1].

*Lines 55-75*

### Three Values

Store three encrypted values. Demonstrates scaling to more values with the same pattern. Order matters: first added = handles[0], second = handles[1], etc.

*Lines 79-98*

### Mixed Types

Store mixed encrypted types (euint64 + ebool) in single input. Shows that different types can share the same encrypted input and proof.

*Lines 102-136*

### Coordinates

Store encrypted 3D coordinates. Practical example for games, location privacy, spatial data. Shows how to group related values.

*Lines 140-160*

### Operations On Multiple

Perform operations on multiple stored encrypted values. Examples: summing values, calculating distance squared, validating account with multiple conditions.

*Lines 164-195*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.add()`
- `FHE.mul()`
- `FHE.le()`
- `FHE.and()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint64`
- `ebool`
- `externalEuint64`
- `externalEbool`

## Tags

`encryption` `batch` `multiple` `fromExternal` `handles` `efficiency` `coklu-sifreleme`

## Related Examples

- [encryption-single](./encryption-single.md)
- [decryption-user-multiple](./decryption-user-multiple.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [decryption-user-single](./decryption-user-single.md)
- [decryption-public-single](./decryption-public-single.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
