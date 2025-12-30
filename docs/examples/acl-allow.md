# Access Control (ACL)

🟡 **Intermediate** | 🔒 Access Control

Demonstrates FHE permission management with allow, allowThis, and allowTransient

## Overview

Access Control Lists (ACL) are critical in FHEVM. Every encrypted value has an ACL that determines who can access it. This example shows how to grant persistent access (allow), contract-level access (allowThis), and temporary access (allowTransient). Understanding ACL is essential for building secure confidential applications.

## Quick Start

```bash
# Create new project from this template
npx labz create acl-allow my-project

# Navigate and install
cd my-project
npm install

# Run tests
npx hardhat test
```

## Code Explanation

### Imports

Standard FHEVM imports. The FHE library contains all ACL functions: allow, allowThis, allowTransient, isAllowed, isSenderAllowed.

*Lines 1-5*

### State

We store an encrypted secret and track who owns it. The owner will have special permissions to share access.

*Lines 10-12*

### Set Secret

Sets the secret and grants initial permissions. allowThis() is critical - without it, the contract cannot use this value in future transactions!

*Lines 17-28*

### Share Access

Demonstrates granting persistent access to another address. Once allowed, that address can decrypt the value off-chain anytime.

*Lines 30-37*

### Share Transient

Demonstrates temporary access with allowTransient. This permission only lasts for the current transaction - useful for one-time operations.

*Lines 39-46*

### Check Access

Shows how to check if an address has access using FHE.isAllowed. Useful for conditional logic based on permissions.

*Lines 48-54*

## Tags

`ACL` `allow` `allowThis` `allowTransient` `permission` `access control` `security`

## Related Examples

- [counter](./counter.md)
- [encryption-single](./encryption-single.md)

## Prerequisites

Before this example, you should understand:
- [counter](./counter.md)

## Next Steps

After this example, check out:
- [user-decrypt-single](./user-decrypt-single.md)
- [antipattern-view](./antipattern-view.md)

---

*Generated with [Lab-Z](https://github.com/Lab-Z)*
