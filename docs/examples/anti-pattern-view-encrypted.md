# Anti-Pattern: View Encrypted

🟢 **Beginner** | ⚠️ Anti-Patterns

Common mistake: expecting view functions to return plaintext instead of encrypted handles

## Overview

This is one of the MOST COMMON mistakes when learning FHEVM. Developers expect view functions to return readable values, but they return encrypted handles that must be decrypted off-chain. Learn why this happens, see the common variations of this mistake, and understand the correct pattern: get handle from view function, then decrypt off-chain using fhevm.userDecryptEuint() with user signature.

## Quick Start

```bash
# Create new project from this template
npx labz create anti-pattern-view-encrypted my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### The Mistake

The mistake: developers think calling getBalance() will return 1000, but it returns 0x1234... (an encrypted handle). You cannot read plaintext from view functions!

*Lines 10-27*

### Why Not Work

View functions return handles (32-byte references to encrypted data). Decryption requires: permission check, user signature, and off-chain processing.

*Lines 29-41*

### Correct Approach

Correct approach: grant permission with FHE.allow(), return handle from view function, then decrypt off-chain using fhevm.userDecryptEuint() with user signature.

*Lines 43-58*

### Anti Pattern Example

ANTI-PATTERN function showing what NOT to expect. Developers call this expecting plaintext but get an encrypted handle instead.

*Lines 78-92*

### Correct Example

CORRECT usage with full client-side code showing how to get handle and then decrypt off-chain properly.

*Lines 96-121*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint64`
- `externalEuint64`

## Tags

`anti-pattern` `mistake` `view` `decrypt` `handle` `common error` `beginner trap` `yaygin hata`

## Related Examples

- [decryption-user-single](./decryption-user-single.md)
- [anti-pattern-missing-allow](./anti-pattern-missing-allow.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [decryption-user-single](./decryption-user-single.md)
- [anti-pattern-missing-allow](./anti-pattern-missing-allow.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
