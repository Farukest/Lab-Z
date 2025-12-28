<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,100:FFCC00&height=140&section=header&text=Lab-Z&fontSize=45&fontColor=FFCC00&fontAlignY=40&animation=fadeIn" width="100%">
</p>
<p align="center">
  <b><big>Composable Template System for Privacy-Preserving Smart Contracts</big></b>
</p>
<p align="center">
  <i>Stop writing FHE boilerplate from scratch.</i><br>
  Generate production ready encrypted smart contracts in seconds with a single CLI command.<br>
  Choose from <b>44 standalone templates</b> or compose custom contracts with <b>16 bases + 13 modules</b>.
</p>


<p align="center">
  <a href="https://www.npmjs.com/package/@0xflydev/labz"><img src="https://img.shields.io/npm/v/@0xflydev/labz?color=CB3837&logo=npm" alt="npm"></a>
  <a href="https://docs.zama.ai/fhevm"><img src="https://img.shields.io/badge/Built%20with-Zama%20FHEVM-yellow" alt="Built with FHEVM"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js" alt="Next.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript"></a>
  <a href="https://soliditylang.org/"><img src="https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity" alt="Solidity"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
</p>

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0000,50:FFCC00,100:FFCC0000&height=6&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Overview-FFD966?style=flat-square" height="68" width="12%">


▸ Lab-Z provides two ways to generate FHE smart contracts:

| Command | Use Case | Templates |
|---------|----------|-----------|
| `labz create` | Quick start with ready-made examples | 44 standalone templates |
| `labz build` | Custom contracts with composable modules | 16 bases + 13 modules |

### ▎Key Features

- **44 standalone templates** across 9 categories (basics, encryption, decryption, acl, input-proofs, anti-patterns, handles, openzeppelin, advanced)
- **16 composable base templates** for DeFi, gaming, voting, and identity
- **13 feature modules** for ACL, admin, security, and FHE operations
- **9 OpenZeppelin ERC7984 + FHEVM** production-ready confidential contracts
- **9-phase validation pipeline** preventing incompatible module combinations
- **CLI with 9 commands**, interactive mode, and visual composer

### ▎CLI Commands

| Command | Options |
|---------|---------|
| `create` | `-i, --interactive` `--git` `--install` `--open` `-o, --output` `-l, --list` `-y, --yes` |
| `build` | `-i, --interactive` `-w, --with` `-t, --type` `--list-bases` `--list-modules` `--check` `--preview` `--dry-run` `-o, --output` `-y, --yes` |
| `list` | `-c, --category` `-d, --difficulty` `-t, --tag` |
| `search` | `-c, --category` `-d, --difficulty` `-b, --blocks` `-l, --limit` |
| `info` | `-c, --code` `-t, --test` `-b, --blocks` |
| `compose` | - |
| `doctor` | `-p, --path` |
| `deploy` | `-n, --network` `--verify` `--no-compile` `-y, --yes` |
| `test` | `--keep` `-y, --yes` |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Quick_Start-FFD966?style=flat-square" height="68" width="14%">

### ▎Installation

**▸ Option A: Install via npm (recommended)**

```bash
npm install -g @0xflydev/labz
#      ↑    ↑        ↑
#      │    │        └── Package name on npm registry
#      │    │
#      │    └── Install globally (available everywhere)
#      │
#      └── Node package manager
```

**▸ Option B: Build from source**

```bash
git clone https://github.com/Farukest/Lab-Z.git
cd Lab-Z

pnpm install
#  ↑     ↑
#  │     └── Download dependencies (TypeScript, FHEVM libs, Hardhat, etc.)
#  │
#  └── Package manager (npm alternative, faster)

pnpm build
#      ↑
#      └── Compile CLI tool and core packages (enables labz commands)
```

### ▎Option 1: Quick Start with `create`

▸ Use `create` for ready-made, tested examples - no configuration needed:

```bash
labz create --list
#      ↑       ↑
#      │       └── Show all 44 available templates grouped by category
#      │
#      └── Standalone project generator (labz = Lab-Z CLI)

labz create prediction-market my-market
#      ↑           ↑              ↑
#      │           │              └── Your project folder name
#      │           │
#      │           └── Template name (from --list)
#      │
#      └── Standalone project generator (labz = Lab-Z CLI)

cd my-market && npm install && npx hardhat test
#     ↑              ↑               ↑
#     │              │               └── Run the included tests
#     │              │
#     │              └── Install dependencies
#     │
#     └── Enter your new project
```

↳ **What you get:** A complete standalone Hardhat project with contract, tests, and configuration.

### ▎Option 2: Quick Start for Custom Build with `build`

▸ Use `build` for composable contracts with modules:

```bash
labz build --list-bases
#  ↑    ↑        ↑
#  │    │        └── Show 16 available base templates
#  │    │
#  │    └── Composable contract generator
#  │
#  └────── Lab-Z CLI tool

labz build --list-modules
#              ↑
#              └── Show 13 available feature modules

labz build auction my-auction --with acl/auction-sharing
#    ↑       ↑         ↑        ↑          ↑
#    │       │         │        │          └── Module name (category/name format)
#    │       │         │        │
#    │       │         │        └── Flag to add feature modules
#    │       │         │
#    │       │         └── Your project folder name
#    │       │
#    │       └── Base template name (from --list-bases)
#    │
#    └────── Lab-Z CLI tool

labz build token my-token --with acl/transient --with functions/encrypted-add
#                            ↑                          ↑
#                            │                          └── Each --with adds another module
#                            │
#                            └── Multiple modules can be combined
```

↳ **What you get:** A custom contract with selected modules injected into appropriate slots.

### ▎create vs build

| | `labz create` | `labz build` |
|---|---|---|
| **Source** | `templates/creatable/{category}/` | `templates/buildable/projects/` + `templates/buildable/modules/` |
| **Format** | Ready `.sol` + `.test.ts` | `.tmpl` templates with slots |
| **Modules** | No | Yes (`--with acl/transient`, `--with functions/encrypted-add`) |
| **Parameters** | No | Yes (`--type euint64`, `--type euint32`) |
| **Best for** | Learning, quick prototypes | Production, customization |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_CLI_Reference-FFD966?style=flat-square" height="68" width="16%">

### ▎labz create

▸ Create project from standalone templates (quick start).

```bash
labz create [template] [project-name] [options]

  -o, --output <dir>    # Output directory (default: current)
  -l, --list            # List available templates
  -y, --yes             # Skip prompts
  -i, --interactive     # Interactive mode with category selection
  --git                 # Initialize git repository
  --install             # Run npm install after creation
  --open                # Open project in VS Code
```

**Examples:**
```bash
labz create --list                              # Show all 44 templates
labz create counter my-counter -y               # Quick create, skip prompts
labz create -i                                  # Interactive category selection
labz create auction my-auction --git --install  # Full setup with git + deps
```

### ▎labz build

▸ Build custom contracts with composable modules.

```bash
labz build [base] [project-name] [options]

  -w, --with <modules...>    # Feature modules to include
  #    ↑
  #    └── Example: labz build auction my-auction --with acl/transient -w admin/roles
  #    └── Explanation: Add FHE or admin modules to customize your contract

  -t, --type <type>          # Encrypted type (euint8, euint32, euint64)
  #    ↑
  #    └── Example: labz build token my-token --type euint64
  #    └── Explanation: Set the encrypted integer size for FHE operations

  -o, --output <dir>         # Output directory
  #    ↑
  #    └── Example: labz build auction my-auction --output ./my-projects
  #    └── Explanation: Generate project in a custom folder instead of current directory

  --list-bases               # List available base templates
  #    ↑
  #    └── Example: labz build --list-bases
  #    └── Explanation: See all 16 base templates (auction, token, voting, etc.)

  --list-modules             # List available modules
  #    ↑
  #    └── Example: labz build --list-modules
  #    └── Explanation: See all 13 modules grouped by category (acl, admin, functions, etc.)

  --check                    # Validate compatibility without generating
  #    ↑
  #    └── Example: labz build auction my-auction --with acl/transient --check
  #    └── Explanation: Test if your module combination is valid before generating

  --preview                  # Preview generated code
  #    ↑
  #    └── Example: labz build auction my-auction --with acl/transient --preview
  #    └── Explanation: See the generated Solidity code without creating files

  --dry-run                  # Show files without creating
  #    ↑
  #    └── Example: labz build auction my-auction --dry-run
  #    └── Explanation: List files that would be created without actually writing them

  -i, --interactive          # Interactive module selection
  #    ↑
  #    └── Example: labz build auction my-auction -i
  #    └── Explanation: Choose modules from a menu instead of typing --with flags

  -y, --yes                  # Skip prompts
  #    ↑
  #    └── Example: labz build auction my-auction -y
  #    └── Explanation: Auto-confirm all prompts for scripting/automation
```

### ▎labz list

▸ List and filter available templates.

```bash
labz list [options]
#     ↑
#     └── List and filter all templates

  -c, --category <cat>      # Filter by category (basics, advanced, openzeppelin...)
  #        ↑
  #        └── Example: labz list --category advanced
  #        └── Explanation: Show only templates in the "advanced" category

  -d, --difficulty <level>  # Filter by difficulty (beginner, intermediate, advanced)
  #         ↑
  #         └── Example: labz list --difficulty beginner
  #         └── Explanation: Filter templates by learning curve level

  -t, --tag <tag...>        # Filter by tags
  #      ↑
  #      └── Example: labz list --tag defi privacy
  #      └── Explanation: Find templates tagged with specific keywords
```

### ▎labz search

▸ Search templates by keyword.

```bash
labz search <query> [options]
#      ↑       ↑
#      │       └── Search term (e.g., "encrypted voting", "auction")
#      │
#      └── Search templates by keyword

  -c, --category <cat>      # Filter by category
  #      ↑
  #      └── Example: labz search "token" -c advanced
  #      └── Explanation: Search only in a specific category

  -d, --difficulty <level>  # Filter by difficulty
  #      ↑
  #      └── Example: labz search "voting" -d beginner
  #      └── Explanation: Search only templates of a specific difficulty

  -b, --blocks              # Include code block matches
  #      ↑
  #      └── Example: labz search "encrypted voting" -b
  #      └── Explanation: Also search inside annotated code blocks

  -l, --limit <n>           # Limit results (default: 10)
  #      ↑
  #      └── Example: labz search "auction" -l 5
  #      └── Explanation: Return only first N matching templates
```

### ▎labz info

▸ Show detailed template information.

```bash
labz info <template> [options]
#     ↑       ↑
#     │       └── Template name (e.g., auction, voting, token)
#     │
#     └── Show template details

  -c, --code                # Show contract source code
  #      ↑
  #      └── Example: labz info auction -c
  #      └── Explanation: Display the full Solidity contract source

  -b, --blocks              # Show annotated code blocks
  #      ↑
  #      └── Example: labz info prediction-market -b
  #      └── Explanation: Show code sections with FHE explanations

  -t, --test                # Show test file
  #      ↑
  #      └── Example: labz info auction -t
  #      └── Explanation: Display the Hardhat test file for this template
```

### ▎labz compose

▸ Interactive visual contract builder (terminal UI).

```bash
labz compose [contract-name]
#       ↑          ↑
#       │          └── Optional contract name (e.g., MyContract)
#       │
#       └── Visual contract builder with terminal UI
#
#  └── Explanation: Opens a terminal menu to select base + modules visually
```

<img width="1231" height="680" alt="image" src="https://github.com/user-attachments/assets/b3f752c4-8536-41ca-97c4-a21b50535ed8" />

### ▎labz doctor

▸ Check FHEVM development environment.

```bash
labz doctor [options]
#     ↑
#     └── Diagnose your FHEVM development setup

  -p, --path <dir>          # Project directory to check
  #      ↑
  #      └── Example: labz doctor -p ./my-project
  #      └── Explanation: Check a specific project directory

# Checks performed:
# - Node.js version (>=18)
# - npm installation
# - FHEVM dependencies (@fhevm/solidity, @fhevm/hardhat-plugin)
# - Hardhat config with FHEVM plugin
# - .env file and environment variables
# - node_modules installation
```

### ▎labz deploy

▸ Deploy contracts to network.

```bash
labz deploy [contract] [options]
#     ↑         ↑
#     │         └── Contract name (auto-detect if not specified)
#     │
#     └── Deploy contracts to blockchain

  -n, --network <network>   # Target network (default: localhost)
  #        ↑
  #        └── Example: labz deploy -n sepolia
  #        └── Networks: localhost, hardhat, sepolia, mainnet

  --verify                  # Verify contract on explorer
  #   ↑
  #   └── Example: labz deploy -n sepolia --verify
  #   └── Explanation: Verify on Etherscan after deployment

  --no-compile              # Skip compilation step
  #      ↑
  #      └── Example: labz deploy --no-compile
  #      └── Explanation: Use existing compiled artifacts

  -y, --yes                 # Skip confirmation prompts
  #    ↑
  #    └── Example: labz deploy -n mainnet -y
  #    └── Explanation: Auto-confirm for CI/CD pipelines
```

### ▎labz test

▸ Test a template in a temporary directory.

```bash
labz test <template> [options]
#     ↑       ↑
#     │       └── Template ID to test
#     │
#     └── Generate, install, compile in temp folder

  --keep                    # Keep the temporary directory after test
  #  ↑
  #  └── Example: labz test counter --keep
  #  └── Explanation: Preserve project for manual testing

  -y, --yes                 # Skip confirmation prompts
  #    ↑
  #    └── Example: labz test counter -y
  #    └── Explanation: Auto-confirm for CI/CD pipelines
```

### <img src="https://img.shields.io/badge/◆_Standalone_Templates-FFD966?style=flat-square" height="68" width="22%">

### ▎Categories

| Category | Templates | Description |
|----------|:---------:|-------------|
| basics | 5 | counter, add, multiply, boolean, bitwise |
| encryption | 2 | encrypt single/multiple values |
| decryption | 4 | user/public decryption (single & multiple) |
| acl | 1 | FHE.allow, allowThis, allowTransient |
| input-proofs | 1 | input proof security |
| anti-patterns | 2 | common mistakes to avoid |
| handles | 4 | FHE handle lifecycle, debugging, symbolic execution |
| openzeppelin | 9 | ERC7984 confidential tokens |
| advanced | 16 | DeFi, gaming, voting, identity |

### ▎Advanced Templates

| Template | Description |
|----------|-------------|
| prediction-market | Polymarket-style with encrypted positions |
| dark-pool | Private DEX order matching |
| sealed-tender | Sealed-bid procurement |
| auction | Blind auction with hidden bids |
| voting | Private voting with homomorphic tallying |
| quadratic-vote | Quadratic voting with encrypted credits |
| lottery | Encrypted lottery with fair randomness |
| dice-game | Provably fair dice |
| poker | Encrypted poker hands |
| mystery-box | NFT mystery box with hidden rarity |
| escrow | Private escrow with dispute resolution |
| token | Confidential ERC20-like token |
| age-gate | Age verification without revealing |
| salary-proof | Salary range proofs |
| blind-match | Private preference matching |
| batch-reveal | Multi-party batch reveal with single proof |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Composable_Templates-FFD966?style=flat-square" height="68" width="22%">

### ▎Base Templates

▸ 16 base templates in `templates/buildable/projects/`:

| Category | Bases |
|----------|-------|
| Basic | counter, token, voting |
| DeFi | auction, escrow, dark-pool, prediction-market |
| Gaming | lottery, dice-game, mystery-box, poker |
| Governance | quadratic-vote, sealed-tender |
| Identity | age-gate, salary-proof, blind-match |

### ▎Feature Modules

▸ 13 modules in `templates/buildable/modules/`:

| Category | Modules |
|----------|---------|
| ACL | transient, sharing, token-sharing, auction-sharing, voting-results |
| Admin | ownable, roles |
| Security | pausable, reentrancy |
| Functions | encrypted-add, encrypted-mul, encrypted-compare |
| Events | basic |

### ▎Example Combinations

```bash
labz build auction sealed-auction --with acl/auction-sharing --with admin/ownable
#           ↑            ↑                       ↑                       ↑
#           │            │                       │                       └── Only owner can end auction
#           │            │                       │
#           │            │                       └── FHE.allow() for encrypted bid sharing
#           │            │
#           │            └── Project folder name
#           │
#           └── Sealed-bid auction base template

labz build token private-erc20 --with acl/transient --with functions/encrypted-add --with admin/roles
#           ↑         ↑                     ↑                        ↑                      ↑
#           │         │                     │                        │                      └── Admin can mint, operator can pause
#           │         │                     │                        │
#           │         │                     │                        └── FHE.add() for balance operations
#           │         │                     │
#           │         │                     └── FHE.allowTransient() temporary decrypt
#           │         │
#           │         └── Project folder name
#           │
#           └── Confidential ERC20-like token

labz build voting dao-voting --with acl/voting-results --with functions/encrypted-compare
#           ↑        ↑                      ↑                           ↑
#           │        │                      │                           └── FHE.lt(), FHE.gt() for vote counting
#           │        │                      │
#           │        │                      └── Share encrypted results with auditors
#           │        │
#           │        └── Project folder name
#           │
#           └── Encrypted voting system

labz build counter my-counter --with functions/encrypted-mul --with security/pausable
#           ↑         ↑                        ↑                         ↑
#           │         │                        │                         └── Emergency pause for security
#           │         │                        │
#           │         │                        └── FHE.mul() encrypted multiplication
#           │         │
#           │         └── Project folder name
#           │
#           └── Simple encrypted counter

labz build token erc7984-defi --with acl/token-sharing --with functions/encrypted-add --with admin/roles
#           ↑         ↑                    ↑                         ↑                        ↑
#           │         │                    │                         │                        └── Role-based mint/burn permissions
#           │         │                    │                         │
#           │         │                    │                         └── FHE.add() for confidential transfers
#           │         │                    │
#           │         │                    └── OpenZeppelin ERC7984 compatible ACL sharing
#           │         │
#           │         └── Project folder name
#           │
#           └── OpenZeppelin-style confidential token base
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_OpenZeppelin_ERC7984-FFD966?style=flat-square" height="68" width="23%">

▸ Production-ready confidential contracts combining OpenZeppelin's battle-tested patterns with Zama FHEVM encryption.

| Template | OpenZeppelin | FHEVM Operations |
|----------|--------------|------------------|
| erc7984-token | ERC7984, Ownable2Step | FHE.add, FHE.allow, FHE.isInitialized |
| erc7984-wrapper | ERC7984ERC20Wrapper | FHE.asEuint64, FHE.allowTransient |
| swap-erc7984-to-erc20 | Ownable, ReentrancyGuard | FHE.sub, public decryption |
| swap-erc7984-to-erc7984 | ReentrancyGuard | FHE.add, FHE.sub, FHE.allowTransient |
| lottery-erc7984 | Ownable, ReentrancyGuard | FHE.randEuint64, encrypted tickets |
| amm-erc7984 | Ownable, ReentrancyGuard | FHE.mul, FHE.div, encrypted liquidity |
| escrow-erc7984 | ReentrancyGuard | FHE.select, encrypted disputes |
| prediction-market-erc7984 | Ownable, ReentrancyGuard | FHE.add, encrypted positions |
| vesting-wallet | Ownable, ReentrancyGuard | euint128, encrypted schedules |

### ▎Usage Examples

```bash
labz create erc7984-token my-confidential-token
#       ↑         ↑               ↑
#       │         │               └── Your project folder name
#       │         │
#       │         └── OpenZeppelin ERC7984 reference implementation
#       │
#       └── Create standalone project (templates/creatable/openzeppelin/)

labz create erc7984-wrapper my-wrapper
#                 ↑             ↑
#                 │             └── Project name
#                 │
#                 └── Wrap existing ERC20 into confidential ERC7984

labz create amm-erc7984 private-amm
#               ↑           ↑
#               │           └── Project name
#               │
#               └── AMM with FHE-encrypted liquidity pools

cd my-confidential-token && npm install && npx hardhat test
#          ↑                     ↑                 ↑
#          │                     │                 └── Run included tests
#          │                     │
#          │                     └── Install dependencies
#          │
#          └── Enter project folder
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Validation_Pipeline-FFD966?style=flat-square" height="68" width="21%">

▸ The `build` command runs 9 validation phases before generating code:

| Phase | Check |
|-------|-------|
| 1 | Base Compatibility |
| 2 | Module Compatibility |
| 3 | Dependency Resolution |
| 4 | Slot Validation |
| 5 | Type Validation |
| 6 | Name Collision |
| 7 | Exclusivity |
| 8 | Size Estimation |
| 9 | Semantic Conflicts |

```bash
# Check before building
labz build token my-token --with admin/roles --with security/reentrancy --check
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Playground-FFD966?style=flat-square" height="68" width="13%">

▸ Copy-paste examples for quick testing after cloning the repo.

<blockquote>

### ▎Quick Create Examples

**Encrypted Counter**
```bash
labz create counter my-counter
```

**Blind Auction**
```bash
labz create auction my-auction
```

**Private Voting**
```bash
labz create voting my-voting
```

</blockquote>

<blockquote>

### ▎OpenZeppelin + FHE Examples

**ERC7984 Confidential Token**
```bash
labz create erc7984-token my-token
```

**ERC20 to ERC7984 Wrapper**
```bash
labz create erc7984-wrapper my-wrapper
```

**Confidential AMM**
```bash
labz create amm-erc7984 my-amm
```

</blockquote>

<blockquote>

### ▎Custom Build Examples

**Auction + FHE Sharing + Owner**
```bash
labz build auction my-sealed-auction --with acl/auction-sharing --with admin/ownable
```

**Token + Encrypted Transfers + Roles**
```bash
labz build token my-private-token --with acl/transient --with functions/encrypted-add --with admin/roles
```

**Voting + FHE Compare + Results**
```bash
labz build voting my-dao-vote --with functions/encrypted-compare --with acl/voting-results
```

</blockquote>

### ▎Run & Test

```bash
cd my-counter && npm install && npx hardhat test
```

### ▎Output Structure

▸ Each command creates a folder with:

| File | Description |
|------|-------------|
| `contracts/*.sol` | Solidity contract with FHE |
| `test/*.test.ts` | Hardhat test file |
| `hardhat.config.ts` | Pre-configured for FHEVM |
| `package.json` | Dependencies ready |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Project_Structure-FFD966?style=flat-square" height="68" width="19%">

```
Lab-Z/
├── packages/
│   ├── core/                    # Template engine, registry, search
│   ├── cli/                     # Command-line interface
│   └── web/                     # Web UI (Next.js)
│
├── base-template/               # Hardhat project skeleton
│
├── templates/
│   ├── creatable/               # For `labz create` (44 standalone)
│   │   ├── basics/              # counter, add, multiply, boolean, bitwise
│   │   ├── encryption/          # single, multiple
│   │   ├── decryption/          # user-single, user-multiple, public-single, public-multiple
│   │   ├── acl/                 # allow demo
│   │   ├── input-proofs/        # input proof security
│   │   ├── anti-patterns/       # common mistakes
│   │   ├── handles/             # handle lifecycle, debugging
│   │   ├── openzeppelin/        # ERC7984 examples
│   │   └── advanced/            # DeFi, gaming, voting, identity
│   │
│   ├── buildable/               # For `labz build` (16 + 13)
│   │   ├── projects/            # 16 base templates (.tmpl)
│   │   └── modules/             # 13 feature modules
│   │       ├── acl/
│   │       ├── admin/
│   │       ├── security/
│   │       ├── functions/
│   │       └── events/
│   │
│   └── _test/                   # Development test environment
│
├── scripts/
│   └── generate-docs.ts         # GitBook documentation generator
│
└── docs/                        # Generated documentation
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Test_Coverage-FFD966?style=flat-square" height="68" width="16%">

```bash
cd templates/_test
npm install
npx hardhat test
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Documentation-FFD966?style=flat-square" height="68" width="16%">

```bash
# Generate GitBook-compatible docs
npm run docs:generate
```

↳ Output in `docs/examples/` with `SUMMARY.md` for navigation.

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_Development-FFD966?style=flat-square" height="68" width="14%">

### ▎Prerequisites

- Node.js 18+
- pnpm 8+

### ▎Setup

```bash
pnpm install
pnpm build
```

### ▎Adding Templates

**Standalone template (for create):**
```
templates/creatable/{category}/{name}/
├── {Name}.sol
├── {Name}.test.ts
└── meta.json
```

**Composable template (for build):**
```
templates/buildable/projects/{name}/
├── contracts/{Name}.sol.tmpl
├── test/{Name}.test.ts.tmpl
└── meta.json

templates/buildable/modules/{category}/{name}/
├── meta.json
└── inject/
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>

- **Issues**: [GitHub Issues](https://github.com/Farukest/FHEIGHT/issues)
- **Twitter**: [@0xflydev](https://twitter.com/0xflydev)
- **GitHub**: [@Farukest](https://github.com/Farukest)

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_References-FFD966?style=flat-square" height="68" width="13%">

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>


### <img src="https://img.shields.io/badge/◆_Implementation_Status-FFD966?style=flat-square" height="68" width="20%">

### Project Structure and Simplicity

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Use only Hardhat | All templates use Hardhat | Complete |
| One repo per example | CLI generates standalone projects | Complete |
| Keep each repo minimal | contracts/, test/, hardhat.config.ts | Complete |
| Shared base-template | base-template/ directory | Complete |
| Generate documentation | scripts/generate-docs.ts | Complete |

### Scaffolding and Automation

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| CLI tool (create-fhevm-example) | labz create, labz build | Complete |
| Clone and customize template | packages/cli/src/commands/create.ts | Complete |
| Insert contract into contracts/ | Automatic during generation | Complete |
| Generate matching tests | Every template includes tests | Complete |
| Auto-generate docs from annotations | scripts/generate-docs.ts with meta.json | Complete |

### Required Example Templates

| Category | Requirement | Template | Status |
|----------|-------------|----------|--------|
| Basic | Simple FHE counter | basics/counter | Complete |
| Basic | Arithmetic (FHE.add, FHE.sub) | basics/add | Complete |
| Basic | Equality comparison (FHE.eq) | basics/boolean | Complete |
| Encryption | Encrypt single value | encryption/single | Complete |
| Encryption | Encrypt multiple values | encryption/multiple | Complete |
| Decryption | User decrypt single | decryption/user-single | Complete |
| Decryption | User decrypt multiple | decryption/user-multiple | Complete |
| Decryption | Public decrypt single | decryption/public-single | Complete |
| Decryption | Public decrypt multiple | decryption/public-multiple | Complete |
| Access Control | FHE.allow | acl/allow | Complete |
| Access Control | FHE.allowTransient | Included in acl templates | Complete |
| Input Proofs | Explanation and usage | input-proofs/ | Complete |
| Anti-patterns | View functions with encrypted | anti-patterns/view-encrypted | Complete |
| Anti-patterns | Missing FHE.allowThis | anti-patterns/missing-allow | Complete |
| Handles | Handle lifecycle | handles/journey | Complete |
| Handles | Symbolic execution | handles/symbolic-execution | Complete |
| OpenZeppelin | ERC7984 example | openzeppelin/erc7984-token | Complete |
| OpenZeppelin | ERC7984 to ERC20 Wrapper | openzeppelin/erc7984-wrapper | Complete |
| OpenZeppelin | Swap ERC7984 to ERC20 | openzeppelin/swap-erc7984-to-erc20 | Complete |
| OpenZeppelin | Swap ERC7984 to ERC7984 | openzeppelin/swap-erc7984-to-erc7984 | Complete |
| OpenZeppelin | Vesting Wallet | openzeppelin/vesting-wallet | Complete |
| Advanced | Blind auction | advanced/auction | Complete |

### Additional Implementations

| Category | Template | Description |
|----------|----------|-------------|
| Advanced | batch-reveal | Multi-party batch reveal with single proof verification |
| Advanced | prediction-market | Polymarket-style encrypted positions |
| Advanced | dark-pool | Private DEX order matching |
| Advanced | sealed-tender | Sealed-bid procurement system |
| Advanced | quadratic-vote | Quadratic voting with encrypted credits |
| Advanced | lottery | Encrypted lottery with fair randomness |
| Advanced | dice-game | Provably fair dice game |
| Advanced | poker | Encrypted poker hands |
| Advanced | mystery-box | NFT mystery box with hidden rarity |
| Advanced | escrow | Private escrow with dispute resolution |
| OpenZeppelin | amm-erc7984 | AMM with confidential liquidity |
| OpenZeppelin | escrow-erc7984 | Confidential escrow with ERC7984 |
| OpenZeppelin | prediction-market-erc7984 | Prediction market with private bets |
| OpenZeppelin | lottery-erc7984 | Lottery using ERC7984 tokens |

### FHE Operations Coverage

| Operation | Templates Using It |
|-----------|-------------------|
| FHE.asEuint64 | All encryption templates |
| FHE.add | basics/add, token, escrow |
| FHE.sub | basics/add, token |
| FHE.mul | basics/multiply |
| FHE.lt, FHE.gt, FHE.eq | basics/boolean, voting, auction |
| FHE.select | auction, voting, quadratic-vote |
| FHE.allow | acl/allow, all decryption templates |
| FHE.allowThis | All templates with storage |
| FHE.allowTransient | acl/allow, token templates |
| FHE.makePubliclyDecryptable | All public decryption templates |
| FHE.checkSignatures | All public decryption templates |
| FHE.fromExternal | All templates with input proofs |
| FHE.randEuint64 | lottery, dice-game, mystery-box |

### Documentation Strategy

| Requirement | Implementation |
|-------------|----------------|
| JSDoc/TSDoc comments in tests | All test files include detailed comments |
| Auto-generate markdown per repo | scripts/generate-docs.ts creates 44 markdown files |
| Tag examples into docs | meta.json with tags, categories, blocks |
| GitBook-compatible | docs/SUMMARY.md, docs/examples/*.md |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0015,50:FFCC0045,100:FFCC0015&height=4&section=header" width="100%"></p>




### <img src="https://img.shields.io/badge/◆_License-FFD966?style=flat-square" height="68" width="11%">

MIT License


<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0000,50:FFCC00,100:FFCC0000&height=6&section=header" width="100%"></p>

**Lab-Z - Composable FHE Smart Contract Templates**

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0000,50:FFCC00,100:FFCC0000&height=6&section=header" width="100%"></p>
