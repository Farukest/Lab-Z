# Anti-Pattern: Missing Allow

🟢 **Beginner** | ⚠️ Anti-Patterns

Common mistake: forgetting FHE.allowThis() and FHE.allow() after creating encrypted values

## Overview

This CRITICAL anti-pattern shows what happens when you forget to set permissions on encrypted values. FHE.allowThis() grants the contract permission to use values in future operations. FHE.allow() grants users permission to decrypt. Forgetting either causes silent failures. Learn the permission checklist: every encrypted value needs explicit permissions, especially computed values which are NEW and don't inherit permissions.

## Quick Start

```bash
# Create new project from this template
npx labz create anti-pattern-missing-allow my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### The Mistake

The mistake: storing encrypted values without calling FHE.allowThis() and FHE.allow(). Results in contract failures and users unable to decrypt their own data.

*Lines 10-24*

### Why Matter

FHE.allowThis() grants contract permission to use values later. FHE.allow(value, address) grants users decrypt permission. Both are required for most use cases.

*Lines 26-43*

### Bad No Allowthis

ANTI-PATTERN: Value stored without FHE.allowThis(). Future contract operations on this value will fail because contract lacks permission.

*Lines 51-65*

### Bad No User

ANTI-PATTERN: Value has allowThis but no FHE.allow(value, user). Contract can use value but user cannot decrypt their own data.

*Lines 78-94*

### Computed Values

CRITICAL: FHE operations (add, mul, etc.) create NEW encrypted values. These NEW values need their own FHE.allowThis() and FHE.allow() calls - permissions don't transfer!

*Lines 118-140*

### Correct Pattern

CORRECT: Both FHE.allowThis() and FHE.allow(value, msg.sender) called. Contract can use value, user can decrypt it.

*Lines 98-112*

## FHE Operations Used

- `FHE.fromExternal()`
- `FHE.add()`
- `FHE.allowThis()`
- `FHE.allow()`

## FHE Types Used

- `euint64`
- `externalEuint64`

## Tags

`anti-pattern` `mistake` `allowThis` `allow` `permission` `ACL` `common error` `izin hatasi`

## Related Examples

- [decryption-user-single](./decryption-user-single.md)
- [anti-pattern-view-encrypted](./anti-pattern-view-encrypted.md)
- [acl-transient](./acl-transient.md)

## Prerequisites

Before this example, you should understand:
- [encryption-single](./encryption-single.md)

## Next Steps

After this example, check out:
- [acl-transient](./acl-transient.md)
- [handles](./handles.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
