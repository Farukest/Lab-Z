# create-labz

Create FHEVM smart contract projects instantly.

## Usage

```bash
npx create-labz
```

Interactive mode - select a template and name your project.

**Or specify directly:**

```bash
npx create-labz counter my-project
npx create-labz auction my-auction
npx create-labz token my-token
```

## Available Templates

| Template | Description |
|----------|-------------|
| `counter` | Simple encrypted counter with increment/decrement |
| `add` | Add two encrypted values |
| `token` | Confidential ERC20-style token |
| `voting` | Private voting system |
| `auction` | Sealed-bid auction with encrypted bids |
| `dice-game` | On-chain dice game with encrypted randomness |
| `lottery` | Private lottery with encrypted tickets |
| `age-gate` | Age verification without revealing birthdate |

## What You Get

```
my-project/
├── contracts/       # Solidity contract with FHEVM
├── test/            # TypeScript test suite
├── deploy/          # Deployment scripts
├── hardhat.config.ts
└── package.json
```

## Next Steps

```bash
cd my-project
npm install
npx hardhat test
```

## Links

- [Full CLI Documentation](https://github.com/Farukest/Lab-Z)
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
