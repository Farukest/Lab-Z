# Handle Journey

🟢 **Beginner** | 🔑 Understanding Handles

Complete lifecycle of an FHE handle from birth to death

## Overview

This educational template demonstrates the complete lifecycle of FHE handles in FHEVM. A handle is a 256-bit reference to encrypted data stored in the coprocessor. This template walks through all 5 stages: Birth (handle creation from plaintext or user input), Permission (ACL grants via allow/allowTransient), Operation (creating child handles via FHE operations), Storage (persisting handles in contract state), and Death (decryption reveals the value). Essential for understanding how encrypted values work in FHEVM.

## Quick Start

```bash
# Create new project from this template
npx labz create handle-journey my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Stage1 Birth

Handle creation from plaintext (FHE.asEuint64) and user input (FHE.fromExternal). Shows how handles are born.

*Lines 85-114*

### Stage2 Permission

Granting permanent (FHE.allow) and transient (FHE.allowTransient) permissions on handles.

*Lines 120-150*

### Stage3 Operation

FHE operations create NEW child handles. Original handles remain unchanged. Demonstrates add, multiply, and compare.

*Lines 156-210*

### Stage4 Storage

Handles stored in contract state persist between transactions. Shows how to maintain encrypted state.

*Lines 216-230*

### Stage5 Death

Decryption is the 'death' of a handle - the value becomes public. Shows 3-step async decryption pattern.

*Lines 236-275*

## FHE Operations Used

- `FHE.FHE.asEuint64()`
- `FHE.FHE.fromExternal()`
- `FHE.FHE.add()`
- `FHE.FHE.mul()`
- `FHE.FHE.gt()`
- `FHE.FHE.allow()`
- `FHE.FHE.allowThis()`
- `FHE.FHE.allowTransient()`
- `FHE.FHE.makePubliclyDecryptable()`
- `FHE.FHE.checkSignatures()`

## FHE Types Used

- `euint64`
- `ebool`
- `externalEuint64`

## Tags

`handles` `lifecycle` `birth` `permission` `operation` `decryption` `educational`

## Related Examples

- [handle-vs-value](./handle-vs-value.md)
- [observatory](./observatory.md)
- [allow](./allow.md)

## Next Steps

After this example, check out:
- [handle-vs-value](./handle-vs-value.md)
- [observatory](./observatory.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
