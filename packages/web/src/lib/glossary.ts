/**
 * FHE Glossary - Term definitions for auto-enrichment
 *
 * This glossary is used across all tutorials.
 * Add new terms here for automatic tooltip enrichment.
 */

export interface GlossaryTerm {
  /** Short description (tooltip) */
  short: string;
  /** Detailed description (expandable) */
  long: string;
  /** Category */
  category: 'fhe-concept' | 'fhe-method' | 'fhe-type' | 'crypto' | 'infrastructure' | 'code' | 'contract-method' | 'solidity';
  /** Example code (optional) */
  example?: string;
  /** Related terms */
  related?: string[];
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  // ============ FHE Concepts ============
  'handle': {
    short: 'Reference to encrypted value (256-bit pointer)',
    long: 'A handle is a 256-bit reference pointing to encrypted data stored in the FHE coprocessor. The handle itself does not contain the encrypted value, it just acts as a pointer to it. Every FHE operation creates a NEW handle.',
    category: 'fhe-concept',
    example: 'euint64 handle = FHE.asEuint64(42);',
    related: ['euint64', 'coprocessor', 'ciphertext'],
  },

  'coprocessor': {
    short: 'Off-chain system that performs FHE operations',
    long: 'Zama\'s FHE coprocessor is a specialized system that performs encryption, decryption, and encrypted computations. It operates independently from the blockchain. All FHE.xxx() calls go to the coprocessor.',
    category: 'infrastructure',
    related: ['handle', 'gateway'],
  },

  'plaintext': {
    short: 'Unencrypted clear value',
    long: 'An unencrypted value that everyone can see. For example, the number 42 is plaintext. It can be encrypted into a handle using FHE.asEuint64().',
    category: 'crypto',
    example: 'uint64 plaintext = 42;',
    related: ['ciphertext', 'encrypt'],
  },

  'ciphertext': {
    short: 'Encrypted value',
    long: 'Data encrypted with FHE. Nobody can see its contents, but computations can be performed on it. Stored on-chain as a handle.',
    category: 'crypto',
    related: ['plaintext', 'handle', 'decrypt'],
  },

  'acl': {
    short: 'Access Control List - Permission management',
    long: 'Every handle has an ACL. It determines which addresses can use or decrypt this handle. Managed with FHE.allow() and FHE.allowThis().',
    category: 'fhe-concept',
    example: 'FHE.allow(handle, msg.sender);',
    related: ['allow', 'allowThis', 'permission'],
  },

  'permission': {
    short: 'Handle usage permission',
    long: 'Permission is required for an address to perform operations on a handle. allowThis() grants permission to the contract, allow() to a specific address, allowTransient() grants temporary permission.',
    category: 'fhe-concept',
    related: ['acl', 'allow', 'allowThis', 'allowTransient'],
  },

  'decrypt': {
    short: 'Convert encrypted value to plaintext',
    long: 'Converting the encrypted value represented by a handle to plaintext. Uses a 3-step async pattern: 1) makePubliclyDecryptable, 2) off-chain decrypt, 3) verify with checkSignatures.',
    category: 'crypto',
    related: ['encrypt', 'plaintext', 'ciphertext'],
  },

  'encrypt': {
    short: 'Convert plaintext to encrypted value',
    long: 'Converting a plaintext value to a handle using FHE encryption. Can be done client-side (createEncryptedInput) or on-chain (FHE.asEuint64).',
    category: 'crypto',
    related: ['decrypt', 'plaintext', 'handle'],
  },

  // ============ FHE Methods ============
  'FHE.asEuint64': {
    short: 'Plaintext → Handle conversion (64-bit)',
    long: 'Encrypts an on-chain plaintext value to create a euint64 handle. The value is now encrypted and private. NOTE: On-chain encryption is visible in tx data, use client-side encryption for real privacy.',
    category: 'fhe-method',
    example: 'euint64 handle = FHE.asEuint64(42);',
    related: ['handle', 'euint64', 'fromExternal'],
  },

  'FHE.fromExternal': {
    short: 'Convert client encryption to handle',
    long: 'Converts client-side SDK encrypted input (externalEuint64) to an on-chain handle (euint64). Validates with ZK proof. This method should be used for real privacy.',
    category: 'fhe-method',
    example: 'euint64 h = FHE.fromExternal(encInput, proof);',
    related: ['externalEuint64', 'inputProof', 'createEncryptedInput'],
  },

  'FHE.add': {
    short: 'Encrypted addition → NEW handle',
    long: 'Adds two encrypted values. The result is a NEW handle - original handles remain unchanged! Permission must be granted for the new handle too.',
    category: 'fhe-method',
    example: 'euint64 sum = FHE.add(a, b);',
    related: ['sub', 'mul', 'handle'],
  },

  'FHE.sub': {
    short: 'Encrypted subtraction → NEW handle',
    long: 'Subtracts two encrypted values. WARNING: Unsigned values wrap-around on underflow!',
    category: 'fhe-method',
    example: 'euint64 diff = FHE.sub(a, b);',
    related: ['add', 'handle'],
  },

  'FHE.mul': {
    short: 'Encrypted multiplication → NEW handle',
    long: 'Multiplies two encrypted values. Most expensive FHE operation - use carefully!',
    category: 'fhe-method',
    example: 'euint64 product = FHE.mul(a, b);',
    related: ['add', 'div', 'handle'],
  },

  'FHE.div': {
    short: 'Encrypted division → NEW handle',
    long: 'Divides encrypted value by a plaintext divisor. Only division by plaintext is supported.',
    category: 'fhe-method',
    example: 'euint64 result = FHE.div(a, 2);',
    related: ['mul', 'handle'],
  },

  'FHE.gt': {
    short: 'Encrypted comparison (>)',
    long: 'Encrypted comparison a > b. Result is ebool (encrypted boolean). Nobody can know the result without decrypting!',
    category: 'fhe-method',
    example: 'ebool isGreater = FHE.gt(a, b);',
    related: ['lt', 'eq', 'ge', 'le', 'ebool'],
  },

  'FHE.lt': {
    short: 'Encrypted comparison (<)',
    long: 'Encrypted comparison a < b. Result is ebool.',
    category: 'fhe-method',
    example: 'ebool isLess = FHE.lt(a, b);',
    related: ['gt', 'eq', 'ebool'],
  },

  'FHE.eq': {
    short: 'Encrypted equality check (==)',
    long: 'Encrypted comparison a == b. Result is ebool.',
    category: 'fhe-method',
    example: 'ebool isEqual = FHE.eq(a, b);',
    related: ['ne', 'gt', 'lt', 'ebool'],
  },

  'FHE.ge': {
    short: 'Encrypted comparison (>=)',
    long: 'Encrypted comparison a >= b. Result is ebool.',
    category: 'fhe-method',
    example: 'ebool result = FHE.ge(a, b);',
    related: ['le', 'gt', 'ebool'],
  },

  'FHE.le': {
    short: 'Encrypted comparison (<=)',
    long: 'Encrypted comparison a <= b. Result is ebool.',
    category: 'fhe-method',
    example: 'ebool result = FHE.le(a, b);',
    related: ['ge', 'lt', 'ebool'],
  },

  'FHE.select': {
    short: 'Encrypted ternary (condition ? a : b)',
    long: 'Encrypted if-else. Condition is ebool, both branches are evaluated but only one is selected. Privacy is preserved.',
    category: 'fhe-method',
    example: 'euint64 result = FHE.select(cond, a, b);',
    related: ['ebool', 'gt', 'eq'],
  },

  'FHE.allowThis': {
    short: 'Grant handle permission to contract',
    long: 'Grants the contract itself permission to use this handle. REQUIRED for storing in storage or using in future transactions!',
    category: 'fhe-method',
    example: 'FHE.allowThis(handle);',
    related: ['allow', 'allowTransient', 'acl', 'permission'],
  },

  'FHE.allow': {
    short: 'Grant permanent decrypt permission to address',
    long: 'Grants a specific address permanent permission to decrypt this handle. Persistent permission - valid across all transactions.',
    category: 'fhe-method',
    example: 'FHE.allow(handle, msg.sender);',
    related: ['allowThis', 'allowTransient', 'acl'],
  },

  'FHE.allowTransient': {
    short: 'Temporary permission (this tx only)',
    long: 'Grants temporary permission - valid only for this transaction. When tx ends, permission is gone. Ideal for passing handles between contracts.',
    category: 'fhe-method',
    example: 'FHE.allowTransient(handle, otherContract);',
    related: ['allow', 'allowThis'],
  },

  'FHE.makePubliclyDecryptable': {
    short: 'Decryption Step 1: Mark for decryption',
    long: 'First step of 3-step async decryption. Marks the handle for public decryption. Anyone can then decrypt it.',
    category: 'fhe-method',
    example: 'FHE.makePubliclyDecryptable(handle);',
    related: ['checkSignatures', 'decrypt'],
  },

  'FHE.checkSignatures': {
    short: 'Decryption Step 3: Verify',
    long: 'Final step of 3-step async decryption. Verifies the off-chain decrypted value and proof.',
    category: 'fhe-method',
    example: 'FHE.checkSignatures(handles, values, proof);',
    related: ['makePubliclyDecryptable', 'decrypt'],
  },

  'FHE.randEuint64': {
    short: 'Generate encrypted random number',
    long: 'Generates a cryptographically secure random number, encrypted. Nobody can know the value without decrypting!',
    category: 'fhe-method',
    example: 'euint64 random = FHE.randEuint64();',
    related: ['handle', 'euint64'],
  },

  // ============ FHE Types ============
  'euint64': {
    short: 'Encrypted unsigned 64-bit integer',
    long: 'Encrypted 64-bit positive integer type. The most commonly used FHE type. Stored as a handle.',
    category: 'fhe-type',
    example: 'euint64 balance;',
    related: ['euint32', 'euint8', 'handle'],
  },

  'euint32': {
    short: 'Encrypted unsigned 32-bit integer',
    long: 'Encrypted 32-bit positive integer type.',
    category: 'fhe-type',
    related: ['euint64', 'euint8'],
  },

  'euint8': {
    short: 'Encrypted unsigned 8-bit integer',
    long: 'Encrypted 8-bit positive integer type. Values 0-255.',
    category: 'fhe-type',
    related: ['euint64', 'euint32'],
  },

  'ebool': {
    short: 'Encrypted boolean',
    long: 'Encrypted boolean type. Comparison results (gt, lt, eq) return ebool. Used with FHE.select.',
    category: 'fhe-type',
    example: 'ebool isValid = FHE.gt(a, b);',
    related: ['select', 'gt', 'eq'],
  },

  'externalEuint64': {
    short: 'Client-side encrypted input',
    long: 'Value encrypted with client SDK. Sent to contract and converted to euint64 using FHE.fromExternal().',
    category: 'fhe-type',
    example: 'function deposit(externalEuint64 amount, bytes proof)',
    related: ['fromExternal', 'inputProof', 'createEncryptedInput'],
  },

  // ============ Infrastructure ============
  'gateway': {
    short: 'Decryption service',
    long: 'Service that performs off-chain decryption operations. Works with threshold decryption.',
    category: 'infrastructure',
    related: ['coprocessor', 'decrypt'],
  },

  'inputProof': {
    short: 'ZK proof for encrypted input',
    long: 'Zero-knowledge proof that verifies the correctness of client-side encryption. Used with FHE.fromExternal().',
    category: 'infrastructure',
    example: 'FHE.fromExternal(encValue, inputProof);',
    related: ['fromExternal', 'externalEuint64'],
  },

  'createEncryptedInput': {
    short: 'Client-side encryption API',
    long: 'fhevmjs SDK function. Encrypts values in browser/client, prepares them for sending to contract.',
    category: 'infrastructure',
    example: 'const input = fhevm.createEncryptedInput(contractAddr, userAddr);',
    related: ['externalEuint64', 'inputProof', 'fromExternal'],
  },

  // ============ Contract Methods (Handle Journey) ============
  'stage1_birthFromPlaintext': {
    short: 'Creates encrypted handle from plaintext value',
    long: 'First FHE step: Takes a clear number (e.g., 42) and converts it to an encrypted handle using FHE.asEuint64(). The handle now lives in the coprocessor.',
    category: 'contract-method',
    example: 'storedHandle = FHE.asEuint64(value);',
    related: ['FHE.asEuint64', 'handle', 'encrypt'],
  },

  'stage1_birthFromEncrypted': {
    short: 'Creates handle from client encryption',
    long: 'Privacy-first approach: Takes input encrypted with client SDK and converts it to a handle using FHE.asEuint64(einput, proof). The value is never exposed.',
    category: 'contract-method',
    example: 'storedHandle = FHE.asEuint64(einput, inputProof);',
    related: ['FHE.asEuint64', 'inputProof', 'externalEuint64'],
  },

  'stage2_grantPermanentPermission': {
    short: 'Grants permanent ACL permission',
    long: 'Grants msg.sender permanent permission using FHE.allow(). This permission is written to blockchain state and valid for all future transactions.',
    category: 'contract-method',
    example: 'FHE.allow(storedHandle, msg.sender);',
    related: ['FHE.allow', 'acl', 'permission'],
  },

  'stage2_grantTransientPermission': {
    short: 'Grants temporary (tx-scope) permission',
    long: 'Grants temporary permission using FHE.allowTransient(). Valid only for THIS transaction - permission disappears when tx ends. Ideal for passing handles between contracts.',
    category: 'contract-method',
    example: 'FHE.allowTransient(storedHandle, to);',
    related: ['FHE.allowTransient', 'permission'],
  },

  'stage3_operationAdd': {
    short: 'Adds two encrypted handles',
    long: 'Adds two encrypted values using FHE.add(). IMPORTANT: Result is a NEW handle - originals remain unchanged! Permission must be granted for the new handle too.',
    category: 'contract-method',
    example: 'resultHandle = FHE.add(storedHandle, secondHandle);',
    related: ['FHE.add', 'handle'],
  },

  'stage3_operationCompare': {
    short: 'Performs encrypted comparison',
    long: 'Compares two encrypted values using FHE.lt(). Result is ebool (encrypted boolean) - nobody can know the result without decrypting!',
    category: 'contract-method',
    example: 'comparisonResult = FHE.lt(storedHandle, secondHandle);',
    related: ['FHE.lt', 'ebool'],
  },

  'stage3_operationSelect': {
    short: 'Encrypted conditional selection (if/else)',
    long: 'Encrypted ternary using FHE.select(). Both branches are evaluated but which one is selected remains secret. Privacy-preserving branching.',
    category: 'contract-method',
    example: 'resultHandle = FHE.select(condition, optionA, optionB);',
    related: ['FHE.select', 'ebool'],
  },

  'stage4_storeOperationResult': {
    short: 'Stores handle in state',
    long: 'Writes the operation result handle to contract storage. Contract must have been granted permission with FHE.allowThis().',
    category: 'contract-method',
    example: 'storedHandle = resultHandle;',
    related: ['FHE.allowThis', 'handle'],
  },

  'stage4_transferHandle': {
    short: 'Transfers handle to another address',
    long: 'Transfers a balance from one address to another. Permission must be granted to the new recipient using FHE.allow().',
    category: 'contract-method',
    example: 'balances[to] = balances[from]; FHE.allow(balances[to], to);',
    related: ['FHE.allow', 'permission'],
  },

  'stage5_requestDecryption': {
    short: 'Starts async decryption',
    long: 'Sends decryption request to Gateway. 3-step async pattern: 1) Send request, 2) Off-chain decrypt, 3) Receive result via callback.',
    category: 'contract-method',
    example: 'Gateway.requestDecryption(handles, callback, ...);',
    related: ['gateway', 'decrypt'],
  },

  'getStoredHandle': {
    short: 'Returns the stored handle',
    long: 'Returns the storedHandle variable from the contract. View function - costs no gas.',
    category: 'contract-method',
    example: 'return storedHandle;',
    related: ['handle'],
  },

  // ============ Solidity Keywords ============
  'msg.sender': {
    short: 'Address that sent the transaction',
    long: 'In Solidity, msg.sender represents the address that called the current function. In external calls it\'s the user address, in internal calls it can be the calling contract address.',
    category: 'solidity',
    example: 'require(msg.sender == owner, "Not owner");',
    related: ['address', 'tx.origin'],
  },

  'this': {
    short: 'The contract\'s own address',
    long: 'In Solidity, this represents the current contract instance. You can get the contract\'s blockchain address with address(this).',
    category: 'solidity',
    example: 'address contractAddr = address(this);',
    related: ['address', 'msg.sender'],
  },

  'address(this)': {
    short: 'Contract\'s blockchain address',
    long: 'Returns the address where the contract is deployed. Used in functions like FHE.allow() to grant the contract permission over itself.',
    category: 'solidity',
    example: 'FHE.allow(handle, address(this));',
    related: ['this', 'FHE.allow'],
  },
};

// Category colors for UI
export const CATEGORY_COLORS: Record<GlossaryTerm['category'], string> = {
  'fhe-concept': '#8b5cf6',    // Purple
  'fhe-method': '#3b82f6',     // Blue
  'fhe-type': '#10b981',       // Green
  'crypto': '#f59e0b',         // Amber
  'infrastructure': '#6b7280', // Gray
  'code': '#ec4899',           // Pink
  'contract-method': '#ec4899', // Pink (same as code)
  'solidity': '#fb923c',       // Orange
};

// Get term (case-insensitive)
export function getTerm(term: string): GlossaryTerm | undefined {
  // Direct match
  if (GLOSSARY[term]) return GLOSSARY[term];

  // Case-insensitive match
  const lowerTerm = term.toLowerCase();
  for (const [key, value] of Object.entries(GLOSSARY)) {
    if (key.toLowerCase() === lowerTerm) return value;
  }

  return undefined;
}

// Get all terms for a category
export function getTermsByCategory(category: GlossaryTerm['category']): string[] {
  return Object.entries(GLOSSARY)
    .filter(([_, term]) => term.category === category)
    .map(([key]) => key);
}
