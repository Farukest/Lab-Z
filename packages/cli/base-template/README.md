# FHEVM Smart Contract

A privacy-preserving smart contract built with Fully Homomorphic Encryption (FHE).

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy (local)
npx hardhat run deploy/deploy.ts
```

## Project Structure

```
contracts/    - Solidity smart contracts
deploy/       - Deployment scripts
test/         - Test files
```

## FHE Operations

This contract uses encrypted data types and operations from the FHEVM library:
- `euint64`, `euint32`, `ebool` - Encrypted integers and booleans
- `FHE.add`, `FHE.sub`, `FHE.mul` - Encrypted arithmetic
- `FHE.lt`, `FHE.gt`, `FHE.eq` - Encrypted comparisons
- `FHE.select` - Encrypted conditional selection

## Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Lab-Z CLI](https://github.com/Farukest/Lab-Z)

---

Generated with [Lab-Z](https://github.com/Farukest/Lab-Z)
