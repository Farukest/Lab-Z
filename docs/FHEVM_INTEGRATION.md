# FHEVM Integration

▸ Technical documentation for Fully Homomorphic Encryption implementation in FHE Compose.

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0000,50:FFCC00,100:FFCC0000&height=6&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Table_of_Contents-FFD966?style=flat-square" height="68" width="18%">

| | | |
|:--|:--|:--|
| [1. Architecture Overview](#architecture-overview) | [5. Input Processing](#input-processing) | [9. Testing Infrastructure](#testing-infrastructure) |
| [2. FHE Type System](#fhe-type-system) | [6. Decryption Patterns](#decryption-patterns) | [10. Common Pitfalls](#common-pitfalls) |
| [3. Encrypted Operations](#encrypted-operations) | [7. Contract Patterns](#contract-patterns) | [11. Gas Optimization](#gas-optimization) |
| [4. Access Control (ACL)](#access-control-acl) | [8. OpenZeppelin ERC7984](#openzeppelin-erc7984-integration) | |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Architecture_Overview-FFD966?style=flat-square" height="68" width="22%">

### ▎System Layers

```
+-------------------+
|    Client Layer   |  - Creates encrypted inputs
|    (Frontend)     |  - Signs decryption requests
+-------------------+
         |
         v
+-------------------+
|   Contract Layer  |  - Stores encrypted state
|    (Solidity)     |  - Performs FHE operations
+-------------------+
         |
         v
+-------------------+
|   FHEVM Gateway   |  - Processes encrypted inputs
|   (Coprocessor)   |  - Executes FHE computations
+-------------------+
         |
         v
+-------------------+
|       KMS         |  - Key management
|                   |  - Decryption proofs
+-------------------+
```

### ▎Data Flow

```
User Input                   Contract State                  Output
-----------                  --------------                  ------

plaintext value              euint64 _balance               decrypted value
     |                            |                              |
     v                            v                              v
fhevm.encrypt()              FHE.add(_balance, input)       publicDecrypt()
     |                            |                              |
     v                            v                              v
einput + proof               updated euint64                 cleartext + proof
     |                            |                              |
     v                            v                              v
FHE.fromExternal()           FHE.allowThis()                 checkSignatures()
```

### ▎Encryption Flow (Client to Contract)

▸ Complete flow of encrypting user input and sending to contract.

```
+------------------+
|   USER (Client)  |
|   value: 1000    |
+------------------+
         |
         | Step 1: Create encrypted input
         v
+------------------------------------------+
|  const input = fhevm.createEncryptedInput |
|      (contractAddress, userAddress)       |
+------------------------------------------+
         |
         | Step 2: Add value(s) to encrypt
         v
+------------------------------------------+
|  input.add64(1000n)                       |
|  input.add8(5)        // multiple values  |
|  input.addBool(true)  // if needed        |
+------------------------------------------+
         |
         | Step 3: Generate encrypted data + ZK proof
         v
+------------------------------------------+
|  const { handles, inputProof } =          |
|      await input.encrypt()                |
|                                           |
|  handles[0] --> encrypted 1000            |
|  handles[1] --> encrypted 5               |
|  handles[2] --> encrypted true            |
|  inputProof --> ZK proof for ALL values   |
+------------------------------------------+
         |
         | Step 4: Send to contract
         v
+------------------------------------------+
|  await contract.deposit(                  |
|      handles[0],   // externalEuint64     |
|      handles[1],   // externalEuint8      |
|      inputProof    // bytes calldata      |
|  )                                        |
+------------------------------------------+
         |
         | Step 5: Contract receives & validates
         v
+------------------------------------------+
|  CONTRACT (Solidity)                      |
|  ---------------------------------------- |
|  function deposit(                        |
|      externalEuint64 amount,              |
|      externalEuint8 option,               |
|      bytes calldata inputProof            |
|  ) external {                             |
|      // Validate proof & convert          |
|      euint64 amt = FHE.fromExternal(      |
|          amount, inputProof);             |
|      euint8 opt = FHE.fromExternal(       |
|          option, inputProof);             |
|                                           |
|      // Now use encrypted values          |
|      _balance = FHE.add(_balance, amt);   |
|                                           |
|      // Set permissions                   |
|      FHE.allowThis(_balance);             |
|      FHE.allow(_balance, msg.sender);     |
|  }                                        |
+------------------------------------------+
         |
         v
+------------------+
|  euint64 stored  |
|  in contract     |
+------------------+
```

### ▎Decryption Flow (Private vs Public)

▸ Two different decryption patterns for different use cases.

```
                          +------------------+
                          |  euint64 handle  |
                          |  (encrypted)     |
                          +------------------+
                                   |
                 +-----------------+-----------------+
                 |                                   |
                 v                                   v
    +------------------------+         +---------------------------+
    |    PRIVATE DECRYPT     |         |     PUBLIC DECRYPT        |
    |    (User Only)         |         |     (Everyone)            |
    +------------------------+         +---------------------------+
                 |                                   |
                 v                                   v
    +------------------------+         +---------------------------+
    | REQUIREMENT:           |         | STEP 1: Mark for reveal   |
    | FHE.allow(handle,user) |         | FHE.makePubliclyDecrypt-  |
    | must be called first   |         |     able(handle)          |
    +------------------------+         +---------------------------+
                 |                                   |
                 v                                   v
    +------------------------+         +---------------------------+
    | CLIENT SIDE:           |         | STEP 2: Off-chain decrypt |
    | const value = await    |         | const result = await      |
    |   fhevm.userDecrypt-   |         |   fhevm.publicDecrypt(    |
    |   Euint(               |         |     [handle]              |
    |     FhevmType.euint64, |         |   );                      |
    |     handle,            |         | const clear = result      |
    |     contractAddress,   |         |   .clearValues[handle];   |
    |     signer             |         | const proof = result      |
    |   );                   |         |   .decryptionProof;       |
    +------------------------+         +---------------------------+
                 |                                   |
                 v                                   v
    +------------------------+         +---------------------------+
    | RESULT:                |         | STEP 3: Finalize on-chain |
    | Only this user sees    |         | await contract.finalize(  |
    | the decrypted value    |         |   clearValue,             |
    | (off-chain only)       |         |   proof                   |
    |                        |         | );                        |
    | Value stays private!   |         |                           |
    +------------------------+         | // Contract verifies:     |
                                       | FHE.checkSignatures(      |
                                       |   cts, cleartexts, proof  |
                                       | );                        |
                                       | // Now public on-chain!   |
                                       +---------------------------+
                                                    |
                                                    v
                                       +---------------------------+
                                       | RESULT:                   |
                                       | Value is now PUBLIC       |
                                       | Everyone can see it       |
                                       | Stored on-chain           |
                                       +---------------------------+

+----------------------------------------------------------------------------+
|                         USE CASE EXAMPLES                                   |
+----------------------------------------------------------------------------+
| PRIVATE:                          | PUBLIC:                                 |
| - User's token balance            | - Auction winner reveal                 |
| - Personal voting choice          | - Lottery result                        |
| - Private health data             | - Game outcome                          |
| - Encrypted credentials           | - Final tally after voting ends         |
+----------------------------------------------------------------------------+
```

### ▎ACL Permission Flow

▸ Three types of permissions for encrypted values.

```
+============================================================================+
|                         ACL PERMISSION TYPES                                |
+============================================================================+

1. FHE.allowThis(handle)
   ----------------------
   +------------------+          +------------------+
   |    Contract A    |  ------> |    Contract A    |
   |  (current tx)    |          |  (future txs)    |
   +------------------+          +------------------+

   Purpose: Contract grants ITSELF permission to use handle in FUTURE transactions
   Duration: Permanent (until handle changes)
   Use case: Storing encrypted state variables

   Example:
   +-----------------------------------------------------------------+
   | function deposit(externalEuint64 amt, bytes calldata proof) {   |
   |     euint64 value = FHE.fromExternal(amt, proof);               |
   |     _balance = FHE.add(_balance, value);                        |
   |                                                                  |
   |     FHE.allowThis(_balance);  // <-- Contract can use _balance  |
   |                               //     in next transaction        |
   | }                                                                |
   +-----------------------------------------------------------------+


2. FHE.allow(handle, address)
   ---------------------------
   +------------------+          +------------------+
   |    Contract      |  ------> |      User        |
   |                  |          | (or any address) |
   +------------------+          +------------------+

   Purpose: Grant permanent decryption permission to an address
   Duration: Permanent
   Use case: User needs to decrypt their own data

   Example:
   +-----------------------------------------------------------------+
   | function deposit(externalEuint64 amt, bytes calldata proof) {   |
   |     euint64 value = FHE.fromExternal(amt, proof);               |
   |     _balances[msg.sender] = value;                              |
   |                                                                  |
   |     FHE.allow(value, msg.sender);  // <-- User can decrypt      |
   |                                    //     their balance         |
   | }                                                                |
   +-----------------------------------------------------------------+


3. FHE.allowTransient(handle, address)
   ------------------------------------
   +------------------+          +------------------+
   |    Contract A    |  ------> |    Contract B    |
   |  (this tx only)  |          |  (this tx only)  |
   +------------------+          +------------------+
            |                             |
            +-----------------------------+
                    Same Transaction

   Purpose: Temporary permission for cross-contract calls
   Duration: Current transaction ONLY (expires after tx)
   Use case: Passing encrypted values between contracts

   Example:
   +-----------------------------------------------------------------+
   | // Contract A: Transfer to Contract B                           |
   | function transferToVault(euint64 amount) external {             |
   |     FHE.allowTransient(amount, address(vault));  // Temporary   |
   |     vault.deposit(amount);  // Vault can use it in this tx      |
   | }                                                                |
   |                                                                  |
   | // Contract B (Vault): Receives the value                       |
   | function deposit(euint64 amount) external {                     |
   |     _vaultBalance = FHE.add(_vaultBalance, amount);             |
   |     FHE.allowThis(_vaultBalance);  // Vault keeps it            |
   | }                                                                |
   +-----------------------------------------------------------------+


+============================================================================+
|                         PERMISSION CHECK FUNCTIONS                          |
+============================================================================+

FHE.isAllowed(handle, address) --> bool
   Check if address has permission for handle

FHE.isSenderAllowed(handle) --> bool
   Check if msg.sender has permission for handle


+============================================================================+
|                         COMMON PATTERNS                                     |
+============================================================================+

Pattern: Store & Grant Access
-----------------------------
euint64 value = FHE.fromExternal(input, proof);
_data[msg.sender] = value;
FHE.allowThis(value);           // Contract can use later
FHE.allow(value, msg.sender);   // User can decrypt


Pattern: After FHE Operations
-----------------------------
euint64 newBalance = FHE.add(oldBalance, deposit);
// IMPORTANT: Result of FHE.add is NEW handle, needs NEW permissions!
FHE.allowThis(newBalance);
FHE.allow(newBalance, msg.sender);


Pattern: Cross-Contract Transfer
--------------------------------
// Sender contract
FHE.allowTransient(amount, receiverContract);
IReceiver(receiverContract).receive(amount);

// Receiver contract
function receive(euint64 amount) external {
    _balance = FHE.add(_balance, amount);
    FHE.allowThis(_balance);
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_FHE_Type_System-FFD966?style=flat-square" height="68" width="17%">

### ▎Encrypted Integer Types

| Type | Size | Solidity Declaration | External Input Type |
|------|------|---------------------|---------------------|
| euint8 | 8-bit | `euint8` | `externalEuint8` |
| euint16 | 16-bit | `euint16` | `externalEuint16` |
| euint32 | 32-bit | `euint32` | `externalEuint32` |
| euint64 | 64-bit | `euint64` | `externalEuint64` |
| euint128 | 128-bit | `euint128` | `externalEuint128` |
| euint256 | 256-bit | `euint256` | `externalEuint256` |

### ▎Other Encrypted Types

| Type | Description | External Input Type |
|------|-------------|---------------------|
| ebool | Encrypted boolean | `externalEbool` |
| eaddress | Encrypted address | `externalEaddress` |
| ebytes64 | 64-byte encrypted data | `externalEbytes64` |
| ebytes128 | 128-byte encrypted data | `externalEbytes128` |
| ebytes256 | 256-byte encrypted data | `externalEbytes256` |

### ▎Type Conversion

```solidity
// Plaintext to encrypted
euint64 encrypted = FHE.asEuint64(100);

// Type casting
euint64 large = FHE.asEuint64(smallValue);  // euint32 -> euint64
euint32 small = FHE.asEuint32(largeValue);  // May truncate

// Boolean conversion
ebool flag = FHE.asEbool(euint8Value);  // 0 = false, non-zero = true

// Address conversion
eaddress encAddr = FHE.asEaddress(msg.sender);
```

### ▎Utility Functions

```solidity
// Check if encrypted value is initialized (not bytes32(0))
bool initialized = FHE.isInitialized(encryptedValue);

// Example: Check if user has a balance
function hasBalance(address account) external view returns (bool) {
    euint64 balance = _balances[account];
    return FHE.isInitialized(balance);
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Encrypted_Operations-FFD966?style=flat-square" height="68" width="21%">

### ▎Arithmetic Operations

```solidity
// Addition
euint64 sum = FHE.add(a, b);

// Subtraction
euint64 diff = FHE.sub(a, b);

// Multiplication
euint64 product = FHE.mul(a, b);

// Division (plaintext divisor only)
euint64 quotient = FHE.div(a, 10);  // a / 10

// Modulo (plaintext divisor only)
euint64 remainder = FHE.rem(a, 6);  // a % 6

// Negation
euint64 neg = FHE.neg(a);  // -a (two's complement)
```

### ▎Comparison Operations

```solidity
// Equality
ebool isEqual = FHE.eq(a, b);

// Not equal
ebool notEqual = FHE.ne(a, b);

// Less than
ebool isLess = FHE.lt(a, b);

// Less or equal
ebool isLessOrEqual = FHE.le(a, b);

// Greater than
ebool isGreater = FHE.gt(a, b);

// Greater or equal
ebool isGreaterOrEqual = FHE.ge(a, b);
```

### ▎Conditional Operations

```solidity
// Select (ternary operator)
euint64 result = FHE.select(condition, valueIfTrue, valueIfFalse);

// Minimum
euint64 minimum = FHE.min(a, b);

// Maximum
euint64 maximum = FHE.max(a, b);
```

### ▎Bitwise Operations

```solidity
// AND
euint32 result = FHE.and(a, b);

// OR
euint32 result = FHE.or(a, b);

// XOR
euint32 result = FHE.xor(a, b);

// NOT (boolean)
ebool result = FHE.not(flag);

// Shift left
euint32 shifted = FHE.shl(a, 2);  // a << 2

// Shift right
euint32 shifted = FHE.shr(a, 2);  // a >> 2

// Rotate left
euint32 rotated = FHE.rotl(a, 2);

// Rotate right
euint32 rotated = FHE.rotr(a, 2);
```

### ▎Random Number Generation

```solidity
// Random 8-bit (0-255)
euint8 rand8 = FHE.randEuint8();

// Random 16-bit
euint16 rand16 = FHE.randEuint16();

// Random 32-bit
euint32 rand32 = FHE.randEuint32();

// Random 64-bit
euint64 rand64 = FHE.randEuint64();

// Random in range [0, 5] (dice roll)
euint8 dice = FHE.add(FHE.rem(FHE.randEuint8(), 6), FHE.asEuint8(1));
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Access_Control_(ACL)-FFD966?style=flat-square" height="68" width="20%">

### ▎Permission Model

▸ Every encrypted value has an Access Control List (ACL) that determines who can decrypt it.

```
Encrypted Value
      |
      +-- ACL
           |
           +-- Contract Address (via allowThis)
           +-- User Address 1 (via allow)
           +-- User Address 2 (via allow)
           +-- Transient Access (via allowTransient)
```

### ▎Granting Access

```solidity
// Grant contract access to use encrypted value
FHE.allowThis(encryptedValue);

// Grant user permanent access to decrypt
FHE.allow(encryptedValue, userAddress);

// Grant temporary access (valid for current transaction)
FHE.allowTransient(encryptedValue, userAddress);
```

### ▎Checking Access

```solidity
// Check if address has access
bool hasAccess = FHE.isAllowed(encryptedValue, address);

// Check if msg.sender has access
bool senderHasAccess = FHE.isSenderAllowed(encryptedValue);
```

### ▎ACL Patterns

**Pattern 1: Private Balance**

```solidity
mapping(address => euint64) private _balances;

function deposit(externalEuint64 amount, bytes calldata proof) external {
    euint64 value = FHE.fromExternal(amount, proof);

    _balances[msg.sender] = FHE.add(_balances[msg.sender], value);

    // User can decrypt their own balance
    FHE.allow(_balances[msg.sender], msg.sender);

    // Contract can use balance for operations
    FHE.allowThis(_balances[msg.sender]);
}
```

**Pattern 2: Shared Access**

```solidity
euint64 private _sharedValue;

function shareWith(address recipient) external {
    require(msg.sender == owner, "Not owner");
    FHE.allow(_sharedValue, recipient);
}
```

**Pattern 3: Transient Access**

```solidity
function grantTemporaryAccess(address viewer) external {
    FHE.allowTransient(_value, viewer);
    // Access expires at end of transaction
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Input_Processing-FFD966?style=flat-square" height="68" width="17%">

### ▎Client-Side Encryption

```typescript
// 1. Create encrypted input builder
const input = fhevmInstance.createEncryptedInput(
    contractAddress,
    userAddress
);

// 2. Add value to encrypt
input.add64(1000n);  // 64-bit value

// 3. Generate encrypted input and proof
const { handles, inputProof } = await input.encrypt();

// 4. Call contract with encrypted data
await contract.method(handles[0], inputProof);
```

### ▎Contract-Side Processing

```solidity
function deposit(
    externalEuint64 encryptedAmount,
    bytes calldata inputProof
) external {
    // Convert external input to internal encrypted type
    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

    // Grant permissions
    FHE.allowThis(amount);
    FHE.allow(amount, msg.sender);

    // Use encrypted value
    _balance = FHE.add(_balance, amount);
}
```

### ▎Multiple Inputs

```typescript
// Client: Multiple encrypted values
const input = fhevmInstance.createEncryptedInput(contractAddress, userAddress);
input.add64(1000n);   // handles[0]
input.add8(5);        // handles[1]
input.addBool(true);  // handles[2]
const { handles, inputProof } = await input.encrypt();

await contract.method(handles[0], handles[1], handles[2], inputProof);
```

```solidity
// Contract: Receive multiple values
function method(
    externalEuint64 amount,
    externalEuint8 option,
    externalEbool flag,
    bytes calldata proof
) external {
    euint64 amt = FHE.fromExternal(amount, proof);
    euint8 opt = FHE.fromExternal(option, proof);
    ebool flg = FHE.fromExternal(flag, proof);

    // Process values...
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Decryption_Patterns-FFD966?style=flat-square" height="68" width="20%">

### ▎Pattern 1: Private Decryption (User Decrypt)

▸ User decrypts their own values using their private key. Requires `FHE.allow()` permission.

```solidity
// Contract: Store value and grant permission
function deposit(externalEuint64 amount, bytes calldata proof) external {
    euint64 value = FHE.fromExternal(amount, proof);
    _balances[msg.sender] = FHE.add(_balances[msg.sender], value);

    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender);  // REQUIRED for user decrypt
}

// Contract: Return encrypted handle
function getMyBalance() external view returns (euint64) {
    return _balances[msg.sender];
}
```

```typescript
import { FhevmType } from "@fhevm/sdk";

// Client: Decrypt with userDecryptEuint
const encryptedBalance = await contract.getMyBalance();

// For euint8/16/32/64 - use userDecryptEuint
const balance = await fhevm.userDecryptEuint(
    FhevmType.euint64,      // Type of encrypted value
    encryptedBalance,        // The encrypted handle
    contractAddress,         // Contract that stores the value
    signer                   // User's signer (must have FHE.allow permission)
);

// For ebool - use userDecryptEbool
const flag = await fhevm.userDecryptEbool(
    encryptedFlag,
    contractAddress,
    signer
);
```

**FhevmType enum:**
```typescript
FhevmType.ebool
FhevmType.euint8
FhevmType.euint16
FhevmType.euint32
FhevmType.euint64
FhevmType.euint128
FhevmType.euint256
FhevmType.eaddress
```

### ▎Pattern 2: Public Decryption (3-Step)

▸ Reveal encrypted values publicly through the Gateway.

**Step 1: Mark for Decryption**

```solidity
euint64 private _encryptedWinner;
uint64 public revealedWinner;
bool public winnerRevealed;

function requestWinnerReveal() external {
    require(!winnerRevealed, "Already revealed");

    // Mark ciphertext for public decryption
    FHE.makePubliclyDecryptable(_encryptedWinner);

    emit WinnerRevealRequested();
}
```

**Step 2: Off-Chain Decryption**

```typescript
// Client: Request decryption from Gateway
const handles = [await contract._encryptedWinner()];
const { cleartexts, decryptionProof } = await fhevmInstance.publicDecrypt(handles);
```

**Step 3: Finalize with Proof**

```solidity
function finalizeWinnerReveal(
    bytes32[] calldata cts,
    uint64[] calldata cleartexts,
    bytes calldata proof
) external {
    require(!winnerRevealed, "Already revealed");

    // Verify Gateway signatures
    FHE.checkSignatures(cts, cleartexts, proof);

    // Store revealed value
    revealedWinner = cleartexts[0];
    winnerRevealed = true;

    emit WinnerRevealed(revealedWinner);
}
```

### ▎Decryption Pattern Matrix

| Pattern | Access | Use Case | Example |
|---------|--------|----------|---------|
| Private | Owner only | Balances, personal data | Token balances |
| Public | Everyone | Auction results, lottery | Winner reveal |
| Conditional | Based on logic | Mutual reveal | Matching results |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Contract_Patterns-FFD966?style=flat-square" height="68" width="18%">

### ▎Pattern 1: Encrypted Counter

```solidity
contract Counter {
    euint32 private _count;

    constructor() {
        _count = FHE.asEuint32(0);
        FHE.allowThis(_count);
    }

    function increment(externalEuint32 amount, bytes calldata proof) external {
        euint32 value = FHE.fromExternal(amount, proof);
        _count = FHE.add(_count, value);
        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }

    function getCount() external view returns (euint32) {
        return _count;
    }
}
```

### ▎Pattern 2: Confidential Token

```solidity
contract ConfidentialToken {
    mapping(address => euint64) private _balances;

    function transfer(
        address to,
        externalEuint64 amount,
        bytes calldata proof
    ) external {
        euint64 transferAmount = FHE.fromExternal(amount, proof);

        // Check sufficient balance
        ebool hasEnough = FHE.ge(_balances[msg.sender], transferAmount);

        // Conditional transfer
        euint64 actualTransfer = FHE.select(
            hasEnough,
            transferAmount,
            FHE.asEuint64(0)
        );

        // Update balances
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], actualTransfer);
        _balances[to] = FHE.add(_balances[to], actualTransfer);

        // Update permissions
        FHE.allowThis(_balances[msg.sender]);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[to], to);
    }
}
```

### ▎Pattern 3: Sealed-Bid Auction

```solidity
contract Auction {
    mapping(address => euint64) private _bids;
    euint64 private _highestBid;
    eaddress private _highestBidder;

    function submitBid(externalEuint64 bid, bytes calldata proof) external {
        euint64 bidAmount = FHE.fromExternal(bid, proof);
        _bids[msg.sender] = bidAmount;

        // Update highest bid
        ebool isHigher = FHE.gt(bidAmount, _highestBid);
        _highestBid = FHE.select(isHigher, bidAmount, _highestBid);
        _highestBidder = FHE.select(
            isHigher,
            FHE.asEaddress(msg.sender),
            _highestBidder
        );

        FHE.allowThis(_highestBid);
        FHE.allowThis(_highestBidder);
    }
}
```

### ▎Pattern 4: Private Voting

```solidity
contract Voting {
    euint32 private _yesVotes;
    euint32 private _noVotes;
    mapping(address => bool) private _hasVoted;

    function vote(externalEbool support, bytes calldata proof) external {
        require(!_hasVoted[msg.sender], "Already voted");
        _hasVoted[msg.sender] = true;

        ebool isYes = FHE.fromExternal(support, proof);
        euint32 one = FHE.asEuint32(1);
        euint32 zero = FHE.asEuint32(0);

        // Add to appropriate counter
        euint32 addToYes = FHE.select(isYes, one, zero);
        euint32 addToNo = FHE.select(isYes, zero, one);

        _yesVotes = FHE.add(_yesVotes, addToYes);
        _noVotes = FHE.add(_noVotes, addToNo);

        FHE.allowThis(_yesVotes);
        FHE.allowThis(_noVotes);
    }
}
```

### ▎Pattern 5: Random Game

```solidity
contract DiceGame {
    struct Game {
        euint8 result;
        bool revealed;
        uint8 revealedResult;
    }

    mapping(uint256 => Game) private _games;

    function rollDice(uint256 gameId) external {
        // Generate random 1-6
        euint8 random = FHE.randEuint8();
        euint8 dice = FHE.add(
            FHE.rem(random, 6),
            FHE.asEuint8(1)
        );

        _games[gameId].result = dice;
        FHE.allowThis(dice);
        FHE.allow(dice, msg.sender);
    }
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_OpenZeppelin_ERC7984_Integration-FFD966?style=flat-square" height="68" width="30%">

▸ Lab-Z includes 9 production-ready examples using OpenZeppelin's confidential contracts library.

### ▎Installation

```bash
pnpm add @openzeppelin/confidential-contracts
```

### ▎ERC7984 Token Standard

▸ ERC7984 is OpenZeppelin's confidential token standard built on FHEVM.

```solidity
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

contract MyToken is ERC7984 {
    constructor() ERC7984("My Token", "MTK", "https://example.com") {
        // Initial setup
    }
}
```

### ▎Core ERC7984 Functions

| Function | Description |
|----------|-------------|
| `confidentialBalanceOf(address)` | Returns encrypted balance handle |
| `confidentialTransfer(to, amount)` | Transfer with euint64 amount |
| `confidentialTransfer(to, encAmount, proof)` | Transfer with external encrypted input |
| `confidentialTransferFrom(from, to, amount)` | Operator transfer |
| `setOperator(operator, expiry)` | Grant time-limited operator approval |
| `isOperator(holder, operator)` | Check if operator is valid |

### ▎Operator Model

▸ ERC7984 uses time-limited operator approvals instead of traditional allowances.

```solidity
// Grant operator permission (valid for 1 day)
token.setOperator(spenderContract, block.timestamp + 86400);

// Check operator status
bool isValid = token.isOperator(holder, operator);
```

### ▎Integration Patterns

**Pattern 1: Contract as Operator**

```solidity
contract Escrow {
    IERC7984 public token;

    function deposit(externalEuint64 amount, bytes calldata proof) external {
        // Contract must be operator for msg.sender
        require(token.isOperator(msg.sender, address(this)), "Set operator first");

        euint64 encAmount = FHE.fromExternal(amount, proof);
        FHE.allowTransient(encAmount, address(token));
        token.confidentialTransferFrom(msg.sender, address(this), encAmount);
    }
}
```

**Pattern 2: ERC20 Wrapper**

```solidity
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

contract WrappedToken is ERC7984ERC20Wrapper {
    constructor(IERC20 underlying)
        ERC7984ERC20Wrapper(underlying, "Wrapped Token", "wTKN", "https://example.com")
    {}
}

// Usage:
// 1. Approve wrapper for ERC20
// 2. Call wrap(to, amount) - deposits ERC20, mints confidential tokens
// 3. Call unwrap(from, to, encAmount, proof) - burns confidential, returns ERC20
```

### ▎Testing ERC7984 Contracts

```typescript
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ERC7984 Contract", function () {
    beforeEach(async function () {
        // IMPORTANT: Use blockchain time for operator expiry
        const currentTime = await time.latest();
        const futureTime = currentTime + 86400;
        await token.connect(user).setOperator(contractAddress, futureTime);
    });

    it("should transfer with operator", async function () {
        // createEncryptedInput must use the contract that calls FHE.fromExternal
        const input = await fhevm
            .createEncryptedInput(contractAddress, user.address) // NOT token address!
            .add64(100n)
            .encrypt();

        await contract.connect(user).deposit(
            input.handles[0],
            input.inputProof
        );
    });
});
```

### ▎Key Testing Considerations

1. **Contract Address in createEncryptedInput**: Use the contract that calls `FHE.fromExternal()`, not the token contract

2. **Blockchain Time for Operators**: Use `time.latest()` instead of `Date.now()` when setting operator expiry

3. **Operator Before TransferFrom**: Contracts must be set as operators before calling `confidentialTransferFrom()`

### ▎Available OpenZeppelin Examples

| Contract | Location | Description |
|----------|----------|-------------|
| ERC7984Example | `contracts/openzeppelin/` | Reference token implementation |
| ERC7984ERC20WrapperExample | `contracts/openzeppelin/` | ERC20 to ERC7984 bridge |
| AMMERC7984 | `contracts/openzeppelin/` | Confidential AMM |
| SwapERC7984ToERC7984 | `contracts/openzeppelin/` | Token-to-token swap |
| SwapERC7984ToERC20 | `contracts/openzeppelin/` | Confidential to public swap |
| EscrowERC7984 | `contracts/openzeppelin/` | Confidential escrow |
| LotteryERC7984 | `contracts/openzeppelin/` | Encrypted lottery |
| PredictionMarketERC7984 | `contracts/openzeppelin/` | Betting market |
| VestingWalletExample | `contracts/openzeppelin/` | Token vesting |

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Testing_Infrastructure-FFD966?style=flat-square" height="68" width="22%">

### ▎Setup

```typescript
import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Contract", function () {
    let contract: Contract;
    let contractAddress: string;
    let owner: HardhatEthersSigner;
    let user: HardhatEthersSigner;

    before(async function () {
        [owner, user] = await hre.ethers.getSigners();

        // Deploy contract
        const factory = await hre.ethers.getContractFactory("Contract");
        contract = await factory.deploy();
        await contract.waitForDeployment();
        contractAddress = await contract.getAddress();

        // Initialize FHEVM coprocessor
        await hre.fhevm.assertCoprocessorInitialized(contract, "Contract");
    });
});
```

### ▎Testing Encrypted Operations

```typescript
it("should handle encrypted input", async function () {
    // Create encrypted input
    const input = hre.fhevm.createEncryptedInput(
        contractAddress,
        user.address
    );
    input.add64(1000n);
    const encrypted = await input.encrypt();

    // Call contract
    await contract.connect(user).deposit(
        encrypted.handles[0],
        encrypted.inputProof
    );

    // Verify state change
    expect(await contract.getBalance(user.address)).to.not.eq(0);
});
```

### ▎Testing Comparisons

```typescript
it("should reject insufficient balance", async function () {
    const transferAmount = 10000n; // More than balance

    const input = hre.fhevm.createEncryptedInput(
        contractAddress,
        user.address
    );
    input.add64(transferAmount);
    const encrypted = await input.encrypt();

    // Should not revert, but transfer 0
    await contract.connect(user).transfer(
        recipient.address,
        encrypted.handles[0],
        encrypted.inputProof
    );

    // Balance unchanged
    expect(await contract.getBalance(user.address)).to.eq(originalBalance);
});
```

### ▎Testing Time-Dependent Logic

```typescript
it("should allow claim after deadline", async function () {
    // Advance blockchain time
    await time.increase(86400); // 1 day

    // Now should succeed
    await expect(contract.claim()).to.not.be.reverted;
});
```

### ▎Testing Reverts

```typescript
it("should reject unauthorized access", async function () {
    await expect(
        contract.connect(attacker).adminFunction()
    ).to.be.revertedWith("Not authorized");
});

it("should reject with custom error", async function () {
    await expect(
        contract.connect(user).invalidOperation()
    ).to.be.revertedWithCustomError(contract, "InvalidOperation");
});
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Common_Pitfalls-FFD966?style=flat-square" height="68" width="16%">

### ▎Pitfall 1: Missing allowThis

```solidity
// WRONG: Contract cannot use stored value
function deposit(externalEuint64 amount, bytes calldata proof) external {
    _balance = FHE.fromExternal(amount, proof);
    // Missing: FHE.allowThis(_balance)
}

// CORRECT: Grant contract access
function deposit(externalEuint64 amount, bytes calldata proof) external {
    _balance = FHE.fromExternal(amount, proof);
    FHE.allowThis(_balance);
}
```

### ▎Pitfall 2: Encrypted Values in View Functions

```solidity
// WRONG: Cannot return encrypted values in view
function getBalance() external view returns (uint64) {
    return _balance;  // Type mismatch: euint64 vs uint64
}

// CORRECT: Return handle, decrypt client-side
function getBalance() external view returns (euint64) {
    return _balance;  // Returns handle
}
```

### ▎Pitfall 3: Division/Modulo with Encrypted Divisor

```solidity
// WRONG: Divisor must be plaintext
euint64 result = FHE.div(a, encryptedDivisor);

// CORRECT: Use plaintext divisor
euint64 result = FHE.div(a, 10);  // Plaintext 10
```

### ▎Pitfall 4: Uninitialized Encrypted Values

```solidity
// WRONG: Using uninitialized encrypted value
euint64 private _value;  // Uninitialized

function add(externalEuint64 amount, bytes calldata proof) external {
    euint64 val = FHE.fromExternal(amount, proof);
    _value = FHE.add(_value, val);  // _value is uninitialized
}

// CORRECT: Initialize in constructor
constructor() {
    _value = FHE.asEuint64(0);
    FHE.allowThis(_value);
}
```

### ▎Pitfall 5: Comparison Result Type

```solidity
// WRONG: Comparison returns ebool, not bool
if (FHE.ge(_balance, amount)) {  // Type error
    // ...
}

// CORRECT: Use select for conditional logic
euint64 actualAmount = FHE.select(
    FHE.ge(_balance, amount),  // ebool
    amount,
    FHE.asEuint64(0)
);
```

### ▎Pitfall 6: ACL Not Updated After Operations

```solidity
// WRONG: New value loses permissions
function transfer(address to, euint64 amount) external {
    _balances[to] = FHE.add(_balances[to], amount);
    // Missing: FHE.allowThis() and FHE.allow()
}

// CORRECT: Update permissions
function transfer(address to, euint64 amount) external {
    _balances[to] = FHE.add(_balances[to], amount);
    FHE.allowThis(_balances[to]);
    FHE.allow(_balances[to], to);
}
```

### ▎Pitfall 7: Single Handle for Multiple Values

▸ Each encrypted value has its own separate handle. You cannot pack multiple values into one handle.

```typescript
// Client-side: Encrypting multiple values
const input = fhevm.createEncryptedInput(contractAddress, userAddress);
input.add64(100);   // → handles[0]
input.add64(200);   // → handles[1]
input.add64(300);   // → handles[2]
const { handles, inputProof } = await input.encrypt();

// WRONG: Using only handles[0] expecting all 3 values
await contract.setAllValues(handles[0], inputProof);
// This only sends the FIRST value (100), not all three!

// CORRECT: Each value needs its own handle
await contract.setValues(
    handles[0],  // 100
    handles[1],  // 200
    handles[2],  // 300
    inputProof   // Single proof for all
);
```

```solidity
// Contract-side
// WRONG: Expecting one handle to contain multiple values
function setAllValues(externalEuint64 allValues, bytes calldata proof) external {
    // Cannot extract multiple values from single handle!
}

// CORRECT: Separate handle for each value
function setValues(
    externalEuint64 value1,
    externalEuint64 value2,
    externalEuint64 value3,
    bytes calldata proof
) external {
    _val1 = FHE.fromExternal(value1, proof);
    _val2 = FHE.fromExternal(value2, proof);
    _val3 = FHE.fromExternal(value3, proof);
}
```

### ▎Pitfall 8: Order Mismatch in Batch Decryption

▸ The decryption proof is cryptographically bound to the specific order of handles. Mismatched order causes verification failure.

```typescript
// Off-chain: Order matters!
const handles = [handle1, handle2, handle3];
const result = await fhevmInstance.publicDecrypt(handles);

// WARNING: Proof is computed for [handle1, handle2, handle3]
// NOT for [handle3, handle1, handle2]!
```

```solidity
// On-chain: Order must match!
function finalizeBatchReveal(
    uint64 clear1,
    uint64 clear2,
    uint64 clear3,
    bytes calldata proof
) external {
    // WRONG: Order mismatch with publicDecrypt call
    bytes32[] memory cts = new bytes32[](3);
    cts[0] = euint64.unwrap(_enc3);  // Wrong order!
    cts[1] = euint64.unwrap(_enc1);
    cts[2] = euint64.unwrap(_enc2);
    bytes memory cleartexts = abi.encode(clear3, clear1, clear2);
    FHE.checkSignatures(cts, cleartexts, proof);  // WILL REVERT!

    // CORRECT: Same order as publicDecrypt([handle1, handle2, handle3])
    bytes32[] memory cts = new bytes32[](3);
    cts[0] = euint64.unwrap(_enc1);  // First
    cts[1] = euint64.unwrap(_enc2);  // Second
    cts[2] = euint64.unwrap(_enc3);  // Third
    bytes memory cleartexts = abi.encode(clear1, clear2, clear3);
    FHE.checkSignatures(cts, cleartexts, proof);  // Success
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Gas_Optimization-FFD966?style=flat-square" height="68" width="17%">

### ▎Operation Costs

| Operation | Relative Gas Cost |
|-----------|-------------------|
| FHE.asEuint* | Low |
| FHE.add / FHE.sub | Low |
| FHE.mul | Medium |
| FHE.div / FHE.rem | Medium |
| FHE.eq / FHE.ne | Low |
| FHE.lt / FHE.le / FHE.gt / FHE.ge | Low |
| FHE.select | Low |
| FHE.min / FHE.max | Low |
| FHE.and / FHE.or / FHE.xor | Low |
| FHE.randEuint* | High |
| FHE.allow | Low |
| FHE.allowThis | Low |
| FHE.fromExternal | Low |

### ▎Optimization Strategies

**1. Batch Operations**

```solidity
// INEFFICIENT: Multiple small operations
for (uint i = 0; i < 10; i++) {
    _total = FHE.add(_total, values[i]);
    FHE.allowThis(_total);
}

// EFFICIENT: Single batch update
euint64 sum = FHE.asEuint64(0);
for (uint i = 0; i < 10; i++) {
    sum = FHE.add(sum, values[i]);
}
_total = sum;
FHE.allowThis(_total);
```

**2. Minimize Random Calls**

```solidity
// INEFFICIENT: Multiple random calls
euint8 card1 = FHE.randEuint8();
euint8 card2 = FHE.randEuint8();
euint8 card3 = FHE.randEuint8();

// EFFICIENT: Single random, derive others
euint64 random = FHE.randEuint64();
euint8 card1 = FHE.asEuint8(random);
euint8 card2 = FHE.asEuint8(FHE.shr(random, 8));
euint8 card3 = FHE.asEuint8(FHE.shr(random, 16));
```

**3. Use Appropriate Types**

```solidity
// INEFFICIENT: Using euint256 for small values
euint256 counter;

// EFFICIENT: Use smallest sufficient type
euint32 counter;  // For values up to 4 billion
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_Version_Compatibility-FFD966?style=flat-square" height="68" width="22%">

### ▎FHEVM API Changes (fhevm-solidity)

| Change | Migration |
|--------|-----------|
| TFHE -> FHE library rename | Replace all TFHE.xxx with FHE.xxx |
| Package rename | Use @fhevm/solidity instead of fhevm |
| fromExternal requires proof | Add inputProof parameter |
| div/rem require plaintext | Ensure divisors are uint, not euint |

### ▎Solidity Imports

```solidity
// Current import structure
import { FHE, euint64, ebool, ... } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract MyContract is ZamaEthereumConfig {
    // Contract code
}
```

<p align="center"><img src="https://capsule-render.vercel.app/api?type=rect&color=0:FFCC0020,50:FFCC0060,100:FFCC0020&height=4&section=header" width="100%"></p>

### <img src="https://img.shields.io/badge/◆_References-FFD966?style=flat-square" height="68" width="13%">

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Solidity API Reference](https://docs.zama.ai/fhevm/api)
- [FHEVM Hardhat Plugin](https://github.com/zama-ai/fhevm-hardhat-plugin)
- [Gateway Decryption Guide](https://docs.zama.ai/fhevm/decryption)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)
- [ERC7984 Token Standard](https://eips.ethereum.org/EIPS/eip-7984)
