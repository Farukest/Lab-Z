# Lab-Z FHEVM Examples

Build privacy-preserving smart contracts using Fully Homomorphic Encryption.

## What is FHEVM?

FHEVM (Fully Homomorphic Encryption Virtual Machine) enables computations on encrypted data without decrypting it. This means smart contracts can process sensitive information (balances, votes, bids) while keeping the actual values hidden from everyone - including validators and node operators.

**Key benefits:**
- Private state variables that remain encrypted on-chain
- Confidential transactions without revealing amounts
- Sealed-bid auctions where bids stay hidden until reveal
- Private voting where individual votes are never exposed

## Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher

Verify your installation:
```bash
node --version  # Should be v18.x or higher
npm --version   # Should be 9.x or higher
```

## Quick Start

```bash
npx create-labz
```

No installation required. Select a template and start building.

**Or specify directly:**

```bash
npx create-labz counter my-project
cd my-project
npm install
npx hardhat test
```

## Project Structure

After running `create-labz`, you get:

```
my-project/
├── contracts/
│   └── Counter.sol       # FHEVM smart contract
├── test/
│   └── Counter.test.ts   # TypeScript test suite
├── deploy/
│   └── deploy.ts         # Deployment script
├── hardhat.config.ts     # Hardhat configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies
└── .gitignore
```

## Running Tests

```bash
cd my-project
npm install
npx hardhat test
```

Tests run on a local FHEVM mock environment. You'll see encrypted operations being performed and verified.

## Deployment

Deploy to Zama devnet:

```bash
npx hardhat run deploy/deploy.ts --network zama
```

For other networks, configure them in `hardhat.config.ts`.

## Templates

| Category | Examples |
|----------|----------|
| **Basics** | Counter, Add, Multiply, Bitwise, Boolean |
| **Encryption** | Single value, Multiple values |
| **Decryption** | User decrypt, Public decrypt |
| **Access Control** | FHE.allow, FHE.allowThis, FHE.allowTransient |
| **Input Proofs** | Proof validation patterns |
| **Anti-Patterns** | Common mistakes to avoid |
| **Handles** | Handle lifecycle, Symbolic execution |
| **OpenZeppelin** | ERC7984, Wrappers, Vesting, AMM |
| **Advanced** | Auction, Voting, Lottery, Poker, Dark Pool |

## Difficulty Levels

- **Beginner** - Simple concepts, minimal code
- **Intermediate** - Multiple FHE operations combined
- **Advanced** - Complex patterns with decryption flows

## Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Lab-Z GitHub](https://github.com/Farukest/Lab-Z)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)
