# Lab-Z Visual Composer

Visual contract builder for creating FHE smart contracts with drag-and-drop blocks.

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0000,50:FFCC00,100:FFCC0000&height=6&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Table_of_Contents-FFD966?style=flat-square" height="68" width="18%">

| | | |
|:--|:--|:--|
| [1. Overview](#overview) | [6. FHE Tips Feed](#fhe-tips-feed) | [11. Interactive Tutorial](#interactive-tutorial) |
| [2. Home Page](#home-page) | [7. Download & Export](#download--export) | [12. Interactive CLI](#interactive-cli) |
| [3. Three-Panel Layout](#three-panel-layout) | [8. Keyboard Shortcuts](#keyboard-shortcuts) | [13. Contract Parser](#contract-parser) |
| [4. Block Library](#block-library) | [9. State Management](#state-management) | [14. Code Generation](#code-generation) |
| [5. Template System](#template-system) | [10. Tutorial System](#tutorial-system) | [15. File Structure](#file-structure) |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Overview-FFD966?style=flat-square" height="68" width="12%">

Lab-Z Visual Composer is a browser-based IDE for building FHE (Fully Homomorphic Encryption) smart contracts. It provides:

- **Drag-and-drop block system** for FHE operations
- **Real-time code generation** as you build
- **Template library** with production-ready contracts
- **Live code preview** with Monaco editor
- **Project export** as downloadable ZIP

### Access

```
http://localhost:3000          # Home Page - Template Browser
http://localhost:3000/compose  # Visual Composer
http://localhost:3000/tutorial/{id}  # Interactive Tutorial
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Home_Page-FFD966?style=flat-square" height="68" width="12%">

The home page (`/`) is the main template browser with search, filtering, and CLI integration.

### Page Layout

```
+------------------------------------------------------------------+
|  Header: Lab-Z Logo | Visual Builder | Know-How | GitHub         |
+------------------------------------------------------------------+
|                                                                  |
|  Hero Section:                                                   |
|    Lab-Z - composable fhe smart contract templates               |
|    CLI Command Showcase                                          |
|    [Try CLI] Button                                              |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|  Search Bar: search templates... (counter, acl, encryption)      |
|                                                                  |
|  Category Tabs: [all] [basics] [encryption] [acl] [advanced]     |
|                                                                  |
|  Results: 44 results • 3 pinned • page 1/4                       |
|                                                                  |
|  +--------+  +--------+  +--------+  +--------+                  |
|  |Template|  |Template|  |Template|  |Template|                  |
|  | Card   |  | Card   |  | Card   |  | Card   |                  |
|  |  📌    |  |        |  |  📌    |  |        |                  |
|  +--------+  +--------+  +--------+  +--------+                  |
|                                                                  |
|  [< prev] [1] [2] [3] [4] [next >]                               |
|                                                                  |
+------------------------------------------------------------------+
|  Features Section | Learning Paths Section | Footer              |
+------------------------------------------------------------------+
```

### Template Card Features

| Feature | Description |
|---------|-------------|
| Name & Difficulty | Template name with difficulty badge (green/yellow/red) |
| Description | Short description of the template |
| Tags | Clickable tags for filtering |
| Pin Button | Pin/unpin template (persisted in localStorage) |
| Tutorial Link | Opens `/tutorial/{id}` for step-by-step learning |
| Download | Downloads template as ZIP file |
| CLI Command | Shows `labz create {id} my-app` command |

### Search & Filtering

| Feature | Description |
|---------|-------------|
| Search | Filters by id, name, description, and tags |
| Category Tabs | Filter by category (basics, encryption, acl, advanced) |
| Pinned First | Pinned templates appear at the top |
| Pagination | 12 items per page with navigation |

### Pinning System

- Click pin icon on template card to pin/unpin
- Pinned templates persist in localStorage (`labz-pinned-templates`)
- Pinned templates always appear first in results
- Counter shows total pinned templates

### Template Detail View

Clicking a template card opens detailed view with:

| Tab | Content |
|-----|---------|
| Interactive | Step-by-step tutorial (if available) |
| contract.sol | Full contract source code |
| test.ts | Test file source code |
| readme | Template documentation |

### Actions

| Action | Description |
|--------|-------------|
| Copy | Copy current tab's code to clipboard |
| Download | Download full project as ZIP |
| CLI Command | Copy `labz create` command |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Three_Panel_Layout-FFD966?style=flat-square" height="68" width="19%">

```
+-------------------+---------------------------+------------------------+
|   Block Library   |    Contract Builder       |    Code Preview        |
|   (Left Panel)    |    (Middle Panel)         |    (Right Panel)       |
+-------------------+---------------------------+------------------------+
|                   |                           |                        |
|  - Quick Add      |  - Contract Name          |  - Monaco Editor       |
|  - Search         |  - Imports Zone           |  - Code Structure      |
|  - Categories:    |  - State Variables Zone   |  - FHE Tips            |
|    - Imports      |  - Functions              |  - Copy/Download       |
|    - State        |    - Function Body Zones  |                        |
|    - Operations   |                           |  Tabs:                 |
|    - ACL          |  Template Selector        |  - Contract            |
|    - Decrypt      |                           |  - Test                |
|                   |                           |  - Deploy              |
+-------------------+---------------------------+------------------------+
```

### Panel Resizing

All panels are resizable by dragging the separator bars between them. The layout persists during the session.

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Block_Library-FFD966?style=flat-square" height="68" width="15%">

### Quick Add Panel

Shows contextually suggested blocks based on current project state:

| Suggestion | When Shown |
|------------|------------|
| Import FHE | No FHE import exists |
| Import Config | No config import exists |
| State Variable | After imports, no state vars |
| FHE Operation | Function selected, needs operations |

Click any Quick Add item to instantly add it to the appropriate zone.

### Block Categories

| Category | Color | Description |
|----------|-------|-------------|
| Imports | Purple | FHE library and config imports |
| State | Blue | Encrypted state variables (euint64, ebool, etc.) |
| Input Conversion | Yellow | FHE.fromExternal() for client inputs |
| Arithmetic | Green | FHE.add(), FHE.sub(), FHE.mul(), FHE.div() |
| Comparison | Orange | FHE.eq(), FHE.lt(), FHE.gt(), etc. |
| Bitwise | Red | FHE.and(), FHE.or(), FHE.xor(), shifts |
| Conditional | Pink | FHE.select(), FHE.min(), FHE.max() |
| ACL | Emerald | FHE.allow(), FHE.allowThis(), FHE.allowTransient() |
| Decrypt | Violet | Decryption patterns |

### Block Availability

Blocks are greyed out when not applicable:

- **Import blocks**: Disabled if already imported
- **State blocks**: Disabled if no imports
- **Operation blocks**: Disabled if no function selected
- **ACL blocks**: Disabled if no encrypted values exist

### Zone Indicators

Each block shows which zones it can be dropped into:

| Badge | Zone |
|-------|------|
| IMP | Imports zone |
| STATE | State variables zone |
| FUNC | Function body zone |

### Drag and Drop

1. Click and hold a block from the library
2. Drag to a compatible drop zone (highlighted green)
3. Release to add the block
4. Invalid zones show red highlight

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Template_System-FFD966?style=flat-square" height="68" width="17%">

### Loading Templates

1. Click **Load Template** button in the Contract Builder header
2. Search or browse available templates
3. Click a template to load it

### Template Behavior

| Action | Result |
|--------|--------|
| Load Template | Original template code displayed in editor |
| Add Block | New block inserted into template code |
| Remove Block | Block removed, template code updated |
| Edit Block | Configuration updated in code |
| Clear | Switches to generated skeleton code |
| Download | Downloads current state (template + modifications) |

### Template Categories

| Category | Examples |
|----------|----------|
| Basics | Counter, Add, Multiply |
| Encryption | Single, Multiple inputs |
| Decryption | User, Public decryption |
| Access Control | ACL patterns |
| OpenZeppelin | ERC7984, AMM, Escrow |
| Advanced | Auction, Voting, Lottery |

### Difficulty Levels

| Level | Indicator |
|-------|-----------|
| Beginner | Green dot |
| Intermediate | Yellow dot |
| Advanced | Red dot |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Code_Structure_Panel-FFD966?style=flat-square" height="68" width="21%">

Located in the right panel, shows parsed structure of current code:

### Sections

| Section | Description |
|---------|-------------|
| License & Pragma | SPDX and Solidity version |
| Imports | FHE library imports |
| Contract Declaration | Contract name and inheritance |
| State Variables | Encrypted state declarations |
| Function: name() | Each function with operation count |

### Click Actions

Clicking any section:

1. **Editor**: Scrolls to that section, highlights lines
2. **Middle Panel**: Scrolls to corresponding blocks, highlights briefly

### Collapse/Expand

- Click the **<** button to collapse the Code Structure panel
- Click **>** to expand when collapsed
- Auto-collapses when panel is too narrow

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_FHE_Tips_Feed-FFD966?style=flat-square" height="68" width="16%">

Dynamic rotating tips at the bottom of Code Structure panel:

### Categories

| Category | Example Tips |
|----------|--------------|
| basics | "Add state variables before operations" |
| input | "Use fromExternal() to convert client inputs" |
| acl | "Always call FHE.allowThis() before storing" |
| concept | "Every FHE operation creates a NEW handle" |
| operations | "FHE.select() is the encrypted if/else" |
| types | "Comparison results are ebool (encrypted)" |
| decrypt | "Decrypt is async: request → callback" |
| gas | "FHE.mul() is the most expensive operation" |
| infra | "Coprocessor stores all encrypted data" |

Tips rotate every 5 seconds. Click dots to manually navigate.

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Download_&_Export-FFD966?style=flat-square" height="68" width="18%">

### Copy Button

Copies current tab's code to clipboard.

### Download Button

Generates a ZIP file containing:

```
project-name/
├── contracts/
│   └── ContractName.sol      # Main contract
├── test/
│   └── ContractName.test.ts  # Test file
├── scripts/
│   └── deploy.ts             # Deploy script
├── package.json              # Dependencies
├── hardhat.config.ts         # Hardhat configuration
└── tsconfig.json             # TypeScript config
```

### Usage After Download

```bash
cd project-name
npm install
npx hardhat test
npx hardhat run scripts/deploy.ts --network sepolia
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Keyboard_Shortcuts-FFD966?style=flat-square" height="68" width="19%">

| Shortcut | Action |
|----------|--------|
| Escape | Cancel current drag operation |
| Tab | Navigate between panels |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_State_Management-FFD966?style=flat-square" height="68" width="18%">

### Zustand Store

The composer uses Zustand for state management:

```typescript
interface ProjectStore {
  // Project State
  project: ProjectState;
  loadedTemplate: LoadedTemplate | null;
  parsedContract: ParsedContract | null;

  // UI State
  selectedFunctionId: string | null;
  draggedBlock: Block | null;
  highlightedBlockId: string | null;

  // Actions
  addImport, removeImport, updateImport
  addStateVariable, removeStateVariable, updateStateVariable
  addFunction, removeFunction, updateFunction
  addToFunctionBody, removeFromFunctionBody
  loadFromContract, resetProject
}
```

### Project State Structure

```typescript
interface ProjectState {
  name: string;
  version: string;
  inherits: string[];
  imports: ProjectBlock[];
  stateVariables: ProjectBlock[];
  functions: ProjectFunction[];
  modifiers: ProjectBlock[];
  constructorBody?: ProjectBlock[];
}
```

### Block Structure

```typescript
interface ProjectBlock {
  id: string;           // Unique instance ID
  blockId: string;      // Block definition ID (e.g., "op-add")
  config: Record<string, string>;  // Parameter values
  order: number;        // Position in zone
  zoneType: ZoneType;   // "imports" | "state" | "function-body"
}
```

### Function Structure

```typescript
interface ProjectFunction {
  id: string;
  name: string;
  visibility: "public" | "private" | "internal" | "external";
  stateMutability?: "pure" | "view" | "payable";
  params: { id: string; name: string; type: string }[];
  returnType?: string;
  body: ProjectBlock[];
  startLine?: number;   // From parsed template
  endLine?: number;     // From parsed template
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Block_Detail_Panel-FFD966?style=flat-square" height="68" width="18%">

### FHE Method Details

Each FHE block in the middle panel has an info button (ℹ️) that expands to show:

| Field | Description |
|-------|-------------|
| Short | Brief one-line description |
| Long | Detailed explanation |
| Example | Code example |
| Related | Related FHE methods |

### Data Source

Details are pulled from the glossary at `/lib/glossary.ts` which contains descriptions for all FHE methods.

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Contract_Parser-FFD966?style=flat-square" height="68" width="17%">

### Parsing Flow

When a template is loaded:

```
Template Code (.sol)
       |
       v
parseContract()
       |
       +---> parseImports()      --> ParsedImport[]
       +---> parseStateVariables() --> ParsedStateVariable[]
       +---> parseFunctions()    --> ParsedFunction[]
       |
       v
ProjectState
```

### Parsed Data

| Type | Fields |
|------|--------|
| ParsedImport | id, statement, path, items, line |
| ParsedStateVariable | id, name, type, visibility, isMapping, line |
| ParsedFunction | id, name, visibility, parameters, returnType, modifiers, startLine, endLine, fheOperations |
| ParsedFHEOperation | id, name, fullCall, line, column |

### Multiline Function Support

The parser handles functions with multiline signatures:

```solidity
function placeBet(
    uint256 marketId,
    bool outcome,
    externalEuint64 encryptedAmount,
    bytes calldata inputProof
) external {
    // ...
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Code_Generation-FFD966?style=flat-square" height="68" width="17%">

### Generation Modes

| Mode | When | Source |
|------|------|--------|
| Template | loadedTemplate is set | Original template + inserted new blocks |
| Generated | No template loaded | Full generation from ProjectState |

### Template Merge Logic

When adding blocks to a loaded template:

1. Identify new blocks (those without `config.line`)
2. Find the target function's `endLine`
3. Generate code for new blocks
4. Insert before function's closing brace
5. Display merged result

### Generated Code Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/Config.sol";

contract ContractName is SepoliaConfig {
    // State variables
    euint64 private _value;

    // Functions
    function myFunction(externalEuint64 input, bytes calldata proof) external {
        euint64 value = FHE.fromExternal(input, proof);
        _value = FHE.add(_value, value);
        FHE.allowThis(_value);
    }
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Tutorial_System-FFD966?style=flat-square" height="68" width="16%">

The Know-How Tutorial system provides step-by-step learning for FHE contracts.

### Access

```
http://localhost:3000/tutorial/{template-id}
```

Example: `/tutorial/handle-journey`, `/tutorial/counter`, `/tutorial/age-gate`

### Available Tutorials

| Template ID | Title | Description |
|-------------|-------|-------------|
| handle-journey | Handle Journey | Understanding FHE handles and data flow |
| prediction-market | Prediction Market | Building encrypted betting markets |
| age-gate | Age Gate | Simple age verification with FHE |
| handle-vs-value | Handle vs Value | Difference between handles and values |
| counter | Counter | Basic encrypted counter |
| boolean | Boolean | Working with ebool type |

### Tutorial Page Layout

```
+------------------------------------------------------------------+
|  Header: Template Name + Difficulty Badge + CLI Command          |
+------------------------------------------------------------------+
|                                                                  |
|  +------------------------+  +--------------------------------+  |
|  |     Test Code Panel    |  |     Contract Code Panel        |  |
|  |     (Left Side)        |  |     (Right Side)               |  |
|  |                        |  |                                |  |
|  |  - Highlighted lines   |  |  - Highlighted lines           |  |
|  |  - Step explanation    |  |  - FHE operation highlight     |  |
|  +------------------------+  +--------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  Step Navigation: [<<] [<] Step 3/12 [>] [>>] [Play/Pause] |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  Concept Box: FHE.fromExternal() explanation               |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

### Features

| Feature | Description |
|---------|-------------|
| Dual Panel | Test code (left) and Contract code (right) side by side |
| Step Highlighting | Current step highlights relevant lines in both panels |
| Flow Arrows | Visual arrows showing data flow between test and contract |
| Concept Boxes | Expandable explanations for FHE concepts |
| Auto-Play | Automatic progression through steps with adjustable speed |
| Mode Toggle | Switch between "Line by Line" and "FHE Steps Only" modes |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Interactive_Tutorial-FFD966?style=flat-square" height="68" width="19%">

### Tutorial Data Structure

```typescript
interface Tutorial {
  templateId: string;        // Matches template ID
  title: string;
  description: string;
  modes: {
    lineByLine: boolean;     // Detailed step-by-step mode
    fheStepsOnly: boolean;   // Only FHE operation steps
  };
  sections: TutorialSection[];
}

interface TutorialSection {
  id: string;                // Usually matches describe() block
  title: string;
  steps: TutorialStep[];
}

interface TutorialStep {
  id: string;
  title: string;
  test?: TutorialCodeRef;     // Left panel highlight
  contract?: TutorialCodeRef; // Right panel highlight
  leftExplanation?: string;   // Test panel explanation
  rightExplanation?: string;  // Contract panel explanation
  fheCall?: TutorialFHECall;  // FHE operation being demonstrated
  flow?: 'test-to-contract' | 'contract-to-test' | 'test-only' | 'contract-only';
  concept?: {
    term: string;
    definition: string;
    example?: string;
  };
  duration?: number;          // Auto-play duration (ms)
}
```

### Code Reference Methods

Tutorial steps can reference code using multiple methods:

| Method | Description | Example |
|--------|-------------|---------|
| `lines` | Manual line numbers [start, end] | `lines: [42, 45]` |
| `method` | Find function by name | `method: "deposit"` |
| `pattern` | Regex pattern match | `pattern: "FHE\\.add"` |
| `fheOp` | Find FHE operation | `fheOp: "fromExternal"` |
| `block` + `call` | Test block + function call | `block: "should deposit", call: "deposit"` |

### Creating a New Tutorial

1. Create file: `packages/web/src/tutorials/{template-id}.tutorial.ts`

```typescript
import { Tutorial, FHE_CONCEPTS } from './types';

export const myTutorial: Tutorial = {
  templateId: 'my-template',
  title: 'My Tutorial',
  description: 'Learn how to...',
  modes: {
    lineByLine: true,
    fheStepsOnly: true,
  },
  sections: [
    {
      id: 'setup',
      title: 'Setup',
      steps: [
        {
          id: 'step-1',
          title: 'Deploy Contract',
          test: { block: 'should deploy', call: 'deploy' },
          contract: { method: 'constructor' },
          leftExplanation: 'First, we deploy the contract...',
          flow: 'test-to-contract',
          concept: FHE_CONCEPTS.HANDLE,
        },
      ],
    },
  ],
};
```

2. Register in `packages/web/src/tutorials/index.ts`:

```typescript
import { myTutorial } from './my-template.tutorial';

export const TUTORIALS: Record<string, Tutorial> = {
  // ...existing tutorials
  'my-template': myTutorial,
};
```

### FHE Concepts Dictionary

Pre-defined concepts available for use in tutorials:

| Constant | Term |
|----------|------|
| `FHE_CONCEPTS.HANDLE` | Handle |
| `FHE_CONCEPTS.ENCRYPTED_INPUT` | Encrypted Input |
| `FHE_CONCEPTS.FROM_EXTERNAL` | FHE.fromExternal() |
| `FHE_CONCEPTS.ALLOW_THIS` | FHE.allowThis() |
| `FHE_CONCEPTS.ALLOW` | FHE.allow() |
| `FHE_CONCEPTS.ALLOW_TRANSIENT` | FHE.allowTransient() |
| `FHE_CONCEPTS.ADD` | FHE.add() |
| `FHE_CONCEPTS.LT` | FHE.lt() |
| `FHE_CONCEPTS.GT` | FHE.gt() |
| `FHE_CONCEPTS.SELECT` | FHE.select() |
| `FHE_CONCEPTS.MAKE_PUBLICLY_DECRYPTABLE` | FHE.makePubliclyDecryptable() |
| `FHE_CONCEPTS.CHECK_SIGNATURES` | FHE.checkSignatures() |
| `FHE_CONCEPTS.USER_DECRYPT` | User Decryption |

### Navigation Controls

| Control | Action |
|---------|--------|
| `<<` | Go to first step |
| `<` | Previous step |
| `>` | Next step |
| `>>` | Go to last step |
| Play/Pause | Toggle auto-play |
| Speed slider | Adjust auto-play speed |

### Tutorial Modes

| Mode | Description |
|------|-------------|
| Line by Line | Shows all steps in detail |
| FHE Steps Only | Skips to steps with FHE operations |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Interactive_CLI-FFD966?style=flat-square" height="68" width="16%">

Browser-based CLI terminal for running Lab-Z commands with live preview and ZIP download.

### Access

Click **Try CLI** button on the home page to open the terminal modal.

### Terminal Layout

```
+------------------------------------------------------------------+
|  Lab-Z CLI                                              [X]       |
+------------------------------------------------------------------+
|                                                                   |
|  Lab-Z CLI - FHE Smart Contract Generator                        |
|                                                                   |
|  $ labz create counter my-counter                                |
|  Creating project from template: counter                         |
|  ✓ Generated: contracts/Counter.sol                              |
|  ✓ Generated: test/Counter.test.ts                               |
|  ✓ Generated: hardhat.config.ts                                  |
|  ✓ Project ready!                                                |
|                                                                   |
|  [Download ZIP]                                                   |
|                                                                   |
+------------------------------------------------------------------+
|  $ labz _                                              [Tab]      |
+------------------------------------------------------------------+
```

### Available Commands

| Command | Description |
|---------|-------------|
| `labz create <template> [name]` | Create project from template |
| `labz build <base> [name]` | Build with composable modules |
| `labz create --list` | List all available templates |
| `labz build --list-bases` | List base templates |
| `labz build --list-modules` | List available modules |
| `labz --help` | Show help |

### Build Flags

| Flag | Description |
|------|-------------|
| `--with, -w <module>` | Add module (can use multiple times) |
| `--type, -t <type>` | Specify output type |
| `--output, -o <path>` | Specify output path |

### Shell Commands

| Command | Description |
|---------|-------------|
| `clear`, `cls` | Clear screen |
| `ls`, `dir` | List files |
| `pwd` | Print working directory |
| `whoami` | Show current user |
| `date` | Show date/time |
| `echo <text>` | Print text |
| `exit`, `quit` | Close CLI |
| `help` | Show help |

### Examples

```bash
# Create from template
labz create counter my-counter
labz create prediction-market my-market

# Build with modules
labz build counter my-project
labz build counter -w functions/encrypted-add
labz build token -w admin/ownable -w security/pausable

# List available options
labz create --list
labz build --list-bases
labz build --list-modules
```

### Features

| Feature | Description |
|---------|-------------|
| Autocomplete | Press Tab for command/template suggestions |
| Command History | Up/Down arrows navigate history |
| Live Output | Real-time command execution feedback |
| ZIP Download | Download button appears after project generation |
| Resizable | Drag bottom edge to resize terminal height |
| Error Handling | Shows error messages for invalid commands |

### API Endpoints

The CLI uses these backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cli/create` | GET | List available templates |
| `/api/cli/create` | POST | Create project from template |
| `/api/cli/build` | GET | List bases and modules |
| `/api/cli/build` | POST | Build project with modules |

### POST Request Format

```typescript
// labz create
POST /api/cli/create
{ "template": "counter", "projectName": "my-counter" }

// labz build
POST /api/cli/build
{ "base": "token", "projectName": "my-token", "modules": ["admin/ownable"] }
```

### Response Format

```typescript
{
  "success": true,
  "projectName": "my-counter",
  "files": ["contracts/Counter.sol", "test/Counter.test.ts", ...],
  "zip": "base64-encoded-zip-data",
  "fileName": "my-counter-project.zip"
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_File_Structure-FFD966?style=flat-square" height="68" width="15%">

```
packages/web/src/
├── app/
│   ├── page.tsx                  # Home page - Template Browser
│   ├── compose/
│   │   └── page.tsx              # Visual Composer page
│   ├── tutorial/
│   │   └── [id]/
│   │       └── page.tsx          # Dynamic tutorial page
│   └── api/
│       ├── templates/
│       │   ├── route.ts          # GET templates list
│       │   └── [id]/route.ts     # GET single template
│       ├── cli/
│       │   ├── create/route.ts   # CLI create command API
│       │   └── build/route.ts    # CLI build command API
│       └── download/
│           └── [id]/route.ts     # Template ZIP download
├── components/
│   ├── header.tsx                # Site header with navigation
│   ├── search-bar.tsx            # Template search input
│   ├── category-tabs.tsx         # Category filter tabs
│   ├── template-grid.tsx         # Template cards grid
│   ├── template-detail.tsx       # Template detail view
│   ├── interactive-cli.tsx       # Browser CLI terminal
│   ├── composer/
│   │   ├── index.tsx             # Main composer with DnD context
│   │   ├── block-library.tsx     # Left panel - draggable blocks
│   │   ├── contract-builder.tsx  # Middle panel - drop zones
│   │   ├── code-preview.tsx      # Right panel - Monaco editor
│   │   ├── quick-add-panel.tsx   # Suggested blocks
│   │   └── block-config-editor.tsx # Block parameter editing
│   ├── interactive-tutorial.tsx  # Tutorial component with dual editors
│   ├── flow-arrow.tsx            # Visual arrows for data flow
│   └── smart-text.tsx            # Text with highlighting
├── tutorials/
│   ├── index.ts                  # Tutorial registry
│   ├── types.ts                  # Tutorial type definitions
│   ├── handle-journey.tutorial.ts
│   ├── prediction-market.tutorial.ts
│   ├── age-gate.tutorial.ts
│   ├── handle-vs-value.tutorial.ts
│   ├── counter.tutorial.ts
│   └── boolean.tutorial.ts
├── hooks/
│   └── use-code-locations.ts     # Dynamic line detection hook
├── store/
│   └── project-store.ts          # Zustand store
└── lib/
    ├── contract-parser.ts        # Solidity parser
    ├── glossary.ts               # FHE method descriptions
    ├── types.ts                  # Type definitions (Template, Category, etc.)
    ├── mock-data.ts              # Fallback template data
    └── i18n.ts                   # Internationalization

packages/core/src/
└── blocks/
    ├── index.ts                  # Block exports
    ├── types.ts                  # Type definitions
    ├── registry.ts               # Block definitions
    ├── validation.ts             # Drop zone validation
    ├── availability.ts           # Block availability logic
    └── generator.ts              # Code generation

templates/
└── creatable/                    # Template source files
    ├── counter/
    │   ├── meta.json             # Template metadata
    │   ├── Counter.sol           # Contract source
    │   └── Counter.test.ts       # Test file
    ├── prediction-market/
    ├── age-gate/
    └── ...
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

---

*Generated with Lab-Z*
