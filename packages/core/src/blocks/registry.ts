/**
 * FHEVM Block Registry
 *
 * All available blocks for building FHE smart contracts
 */

import { Block } from './types';

export const blocks: Block[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // IMPORTS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'import-fhe',
    name: 'FHE Library',
    description: 'Import FHE library with encrypted types',
    category: 'import',
    canDropIn: ['imports'],
    template: 'import { FHE, {{types}} } from "@fhevm/solidity/lib/FHE.sol";',
    params: [
      {
        id: 'types',
        label: 'Types to import',
        type: 'string',
        default: 'euint32, externalEuint32'
      }
    ],
    tags: ['import', 'fhe', 'library', 'start'],
    icon: '📦',
    color: '#3b82f6'
  },
  {
    id: 'import-config',
    name: 'Network Config',
    description: 'Import network configuration (SepoliaConfig)',
    category: 'import',
    canDropIn: ['imports'],
    template: 'import { SepoliaConfig } from "@fhevm/solidity/config/Config.sol";',
    params: [],
    tags: ['import', 'config', 'network', 'sepolia'],
    icon: '⚙️',
    color: '#8b5cf6'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // STATE VARIABLES
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'state-euint8',
    name: 'euint8',
    description: 'Encrypted 8-bit unsigned integer',
    category: 'state',
    canDropIn: ['state'],
    requires: ['import-fhe'],
    template: 'euint8 private {{name}};',
    params: [
      { id: 'name', label: 'Variable name', type: 'string', default: '_value8', required: true }
    ],
    outputType: 'euint8',
    tags: ['state', 'variable', 'euint8', 'uint8', 'encrypted', '8-bit'],
    icon: '🔢',
    color: '#22c55e'
  },
  {
    id: 'state-euint16',
    name: 'euint16',
    description: 'Encrypted 16-bit unsigned integer',
    category: 'state',
    canDropIn: ['state'],
    requires: ['import-fhe'],
    template: 'euint16 private {{name}};',
    params: [
      { id: 'name', label: 'Variable name', type: 'string', default: '_value16', required: true }
    ],
    outputType: 'euint16',
    tags: ['state', 'variable', 'euint16', 'uint16', 'encrypted', '16-bit'],
    icon: '🔢',
    color: '#22c55e'
  },
  {
    id: 'state-euint32',
    name: 'euint32',
    description: 'Encrypted 32-bit unsigned integer',
    category: 'state',
    canDropIn: ['state'],
    requires: ['import-fhe'],
    template: 'euint32 private {{name}};',
    params: [
      { id: 'name', label: 'Variable name', type: 'string', default: '_value', required: true }
    ],
    outputType: 'euint32',
    tags: ['state', 'variable', 'euint32', 'uint32', 'encrypted', '32-bit', 'counter', 'balance'],
    icon: '🔢',
    color: '#22c55e'
  },
  {
    id: 'state-euint64',
    name: 'euint64',
    description: 'Encrypted 64-bit unsigned integer',
    category: 'state',
    canDropIn: ['state'],
    requires: ['import-fhe'],
    template: 'euint64 private {{name}};',
    params: [
      { id: 'name', label: 'Variable name', type: 'string', default: '_value64', required: true }
    ],
    outputType: 'euint64',
    tags: ['state', 'variable', 'euint64', 'uint64', 'encrypted', '64-bit', 'balance', 'amount'],
    icon: '🔢',
    color: '#22c55e'
  },
  {
    id: 'state-euint128',
    name: 'euint128',
    description: 'Encrypted 128-bit unsigned integer',
    category: 'state',
    canDropIn: ['state'],
    requires: ['import-fhe'],
    template: 'euint128 private {{name}};',
    params: [
      { id: 'name', label: 'Variable name', type: 'string', default: '_value128', required: true }
    ],
    outputType: 'euint128',
    tags: ['state', 'variable', 'euint128', 'uint128', 'encrypted', '128-bit', 'large'],
    icon: '🔢',
    color: '#22c55e'
  },
  {
    id: 'state-euint256',
    name: 'euint256',
    description: 'Encrypted 256-bit unsigned integer',
    category: 'state',
    canDropIn: ['state'],
    requires: ['import-fhe'],
    template: 'euint256 private {{name}};',
    params: [
      { id: 'name', label: 'Variable name', type: 'string', default: '_value256', required: true }
    ],
    outputType: 'euint256',
    tags: ['state', 'variable', 'euint256', 'uint256', 'encrypted', '256-bit', 'large'],
    icon: '🔢',
    color: '#22c55e'
  },
  {
    id: 'state-ebool',
    name: 'ebool',
    description: 'Encrypted boolean',
    category: 'state',
    canDropIn: ['state'],
    requires: ['import-fhe'],
    template: 'ebool private {{name}};',
    params: [
      { id: 'name', label: 'Variable name', type: 'string', default: '_flag', required: true }
    ],
    outputType: 'ebool',
    tags: ['state', 'variable', 'ebool', 'bool', 'boolean', 'encrypted', 'flag', 'condition'],
    icon: '🔘',
    color: '#f59e0b'
  },
  {
    id: 'state-eaddress',
    name: 'eaddress',
    description: 'Encrypted address',
    category: 'state',
    canDropIn: ['state'],
    requires: ['import-fhe'],
    template: 'eaddress private {{name}};',
    params: [
      { id: 'name', label: 'Variable name', type: 'string', default: '_hiddenAddress', required: true }
    ],
    outputType: 'eaddress',
    tags: ['state', 'variable', 'eaddress', 'address', 'encrypted', 'wallet', 'owner'],
    icon: '📍',
    color: '#ec4899'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // INPUT CONVERSION
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'op-fromExternal',
    name: 'FHE.fromExternal()',
    description: 'Convert external encrypted input to internal type',
    category: 'input-conversion',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['op-*', 'acl-*'],
    template: '{{outputType}} {{output}} = FHE.fromExternal({{input}}, {{proof}});',
    params: [
      { id: 'outputType', label: 'Output type', type: 'type-select', options: ['euint8', 'euint16', 'euint32', 'euint64', 'euint128', 'euint256', 'ebool', 'eaddress'], default: 'euint32' },
      { id: 'output', label: 'Output variable', type: 'string', default: 'eValue' },
      { id: 'input', label: 'External input', type: 'string', default: 'inputHandle' },
      { id: 'proof', label: 'Proof parameter', type: 'string', default: 'inputProof' }
    ],
    outputType: 'euint*',
    tags: ['fromExternal', 'input', 'convert', 'external', 'proof', 'validate'],
    icon: '📥',
    color: '#06b6d4'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ARITHMETIC OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'op-add',
    name: 'FHE.add()',
    description: 'Add two encrypted values',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint8+euint8', 'euint16+euint16', 'euint32+euint32', 'euint64+euint64', 'euint128+euint128', 'euint256+euint256'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.add({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', variableType: 'euint*', required: true },
      { id: 'a', label: 'First operand', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second operand', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['add', 'addition', 'plus', 'sum', 'arithmetic', 'math', '+'],
    icon: '➕',
    color: '#10b981'
  },
  {
    id: 'op-sub',
    name: 'FHE.sub()',
    description: 'Subtract two encrypted values',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint8+euint8', 'euint16+euint16', 'euint32+euint32', 'euint64+euint64', 'euint128+euint128', 'euint256+euint256'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.sub({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', variableType: 'euint*', required: true },
      { id: 'a', label: 'First operand', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second operand', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['sub', 'subtract', 'minus', 'difference', 'arithmetic', 'math', '-'],
    icon: '➖',
    color: '#10b981'
  },
  {
    id: 'op-mul',
    name: 'FHE.mul()',
    description: 'Multiply two encrypted values',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint8+euint8', 'euint16+euint16', 'euint32+euint32', 'euint64+euint64'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.mul({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', variableType: 'euint*', required: true },
      { id: 'a', label: 'First operand', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second operand', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['mul', 'multiply', 'times', 'product', 'arithmetic', 'math', '*'],
    icon: '✖️',
    color: '#10b981'
  },
  {
    id: 'op-div',
    name: 'FHE.div()',
    description: 'Divide two encrypted values',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint8+euint8', 'euint16+euint16', 'euint32+euint32', 'euint64+euint64'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.div({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', variableType: 'euint*', required: true },
      { id: 'a', label: 'Dividend', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Divisor', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['div', 'divide', 'division', 'quotient', 'arithmetic', 'math', '/'],
    icon: '➗',
    color: '#10b981'
  },
  {
    id: 'op-rem',
    name: 'FHE.rem()',
    description: 'Remainder (modulo) of two encrypted values',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint8+euint8', 'euint16+euint16', 'euint32+euint32', 'euint64+euint64'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.rem({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', variableType: 'euint*', required: true },
      { id: 'a', label: 'Dividend', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Divisor', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['rem', 'remainder', 'modulo', 'mod', 'arithmetic', 'math', '%'],
    icon: '🔢',
    color: '#10b981'
  },
  {
    id: 'op-min',
    name: 'FHE.min()',
    description: 'Minimum of two encrypted values',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint8+euint8', 'euint16+euint16', 'euint32+euint32', 'euint64+euint64'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.min({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', variableType: 'euint*', required: true },
      { id: 'a', label: 'First value', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second value', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['min', 'minimum', 'smallest', 'lower', 'arithmetic'],
    icon: '⬇️',
    color: '#10b981'
  },
  {
    id: 'op-max',
    name: 'FHE.max()',
    description: 'Maximum of two encrypted values',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint8+euint8', 'euint16+euint16', 'euint32+euint32', 'euint64+euint64'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.max({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', variableType: 'euint*', required: true },
      { id: 'a', label: 'First value', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second value', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['max', 'maximum', 'largest', 'higher', 'arithmetic'],
    icon: '⬆️',
    color: '#10b981'
  },
  {
    id: 'op-neg',
    name: 'FHE.neg()',
    description: 'Negate an encrypted value (two\'s complement)',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint8', 'euint16', 'euint32', 'euint64'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.neg({{a}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', variableType: 'euint*', required: true },
      { id: 'a', label: 'Value to negate', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['neg', 'negate', 'negative', 'minus', 'arithmetic'],
    icon: '🔄',
    color: '#10b981'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // COMPARISON OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'op-eq',
    name: 'FHE.eq()',
    description: 'Check if two encrypted values are equal',
    category: 'comparison',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    inputTypes: ['euint*+euint*', 'ebool+ebool', 'eaddress+eaddress'],
    outputType: 'ebool',
    template: '{{result}} = FHE.eq({{a}}, {{b}});',
    params: [
      { id: 'result', label: 'Result variable', type: 'string', default: 'isEqual', required: true },
      { id: 'a', label: 'First value', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second value', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['eq', 'equal', 'equals', 'compare', 'comparison', '=='],
    icon: '🟰',
    color: '#f59e0b'
  },
  {
    id: 'op-ne',
    name: 'FHE.ne()',
    description: 'Check if two encrypted values are not equal',
    category: 'comparison',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    inputTypes: ['euint*+euint*', 'ebool+ebool', 'eaddress+eaddress'],
    outputType: 'ebool',
    template: '{{result}} = FHE.ne({{a}}, {{b}});',
    params: [
      { id: 'result', label: 'Result variable', type: 'string', default: 'notEqual', required: true },
      { id: 'a', label: 'First value', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second value', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['ne', 'not equal', 'notequal', 'compare', 'comparison', '!='],
    icon: '≠',
    color: '#f59e0b'
  },
  {
    id: 'op-gt',
    name: 'FHE.gt()',
    description: 'Check if first value is greater than second',
    category: 'comparison',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    inputTypes: ['euint*+euint*'],
    outputType: 'ebool',
    template: '{{result}} = FHE.gt({{a}}, {{b}});',
    params: [
      { id: 'result', label: 'Result variable', type: 'string', default: 'isGreater', required: true },
      { id: 'a', label: 'First value', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second value', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['gt', 'greater', 'greater than', 'compare', 'comparison', '>'],
    icon: '>',
    color: '#f59e0b'
  },
  {
    id: 'op-ge',
    name: 'FHE.ge()',
    description: 'Check if first value is greater than or equal',
    category: 'comparison',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    inputTypes: ['euint*+euint*'],
    outputType: 'ebool',
    template: '{{result}} = FHE.ge({{a}}, {{b}});',
    params: [
      { id: 'result', label: 'Result variable', type: 'string', default: 'isGreaterOrEqual', required: true },
      { id: 'a', label: 'First value', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second value', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['ge', 'greater equal', 'gte', 'compare', 'comparison', '>='],
    icon: '≥',
    color: '#f59e0b'
  },
  {
    id: 'op-lt',
    name: 'FHE.lt()',
    description: 'Check if first value is less than second',
    category: 'comparison',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    inputTypes: ['euint*+euint*'],
    outputType: 'ebool',
    template: '{{result}} = FHE.lt({{a}}, {{b}});',
    params: [
      { id: 'result', label: 'Result variable', type: 'string', default: 'isLess', required: true },
      { id: 'a', label: 'First value', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second value', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['lt', 'less', 'less than', 'compare', 'comparison', '<'],
    icon: '<',
    color: '#f59e0b'
  },
  {
    id: 'op-le',
    name: 'FHE.le()',
    description: 'Check if first value is less than or equal',
    category: 'comparison',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    inputTypes: ['euint*+euint*'],
    outputType: 'ebool',
    template: '{{result}} = FHE.le({{a}}, {{b}});',
    params: [
      { id: 'result', label: 'Result variable', type: 'string', default: 'isLessOrEqual', required: true },
      { id: 'a', label: 'First value', type: 'variable', variableType: 'euint*', required: true },
      { id: 'b', label: 'Second value', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['le', 'less equal', 'lte', 'compare', 'comparison', '<='],
    icon: '≤',
    color: '#f59e0b'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BITWISE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'op-and',
    name: 'FHE.and()',
    description: 'Bitwise AND of two encrypted values',
    category: 'bitwise',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint*+euint*', 'ebool+ebool'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.and({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'a', label: 'First operand', type: 'variable', required: true },
      { id: 'b', label: 'Second operand', type: 'variable', required: true }
    ],
    tags: ['and', 'bitwise', 'binary', '&', 'logic'],
    icon: '&',
    color: '#8b5cf6'
  },
  {
    id: 'op-or',
    name: 'FHE.or()',
    description: 'Bitwise OR of two encrypted values',
    category: 'bitwise',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint*+euint*', 'ebool+ebool'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.or({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'a', label: 'First operand', type: 'variable', required: true },
      { id: 'b', label: 'Second operand', type: 'variable', required: true }
    ],
    tags: ['or', 'bitwise', 'binary', '|', 'logic'],
    icon: '|',
    color: '#8b5cf6'
  },
  {
    id: 'op-xor',
    name: 'FHE.xor()',
    description: 'Bitwise XOR of two encrypted values',
    category: 'bitwise',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint*+euint*', 'ebool+ebool'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.xor({{a}}, {{b}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'a', label: 'First operand', type: 'variable', required: true },
      { id: 'b', label: 'Second operand', type: 'variable', required: true }
    ],
    tags: ['xor', 'bitwise', 'binary', '^', 'logic', 'exclusive or'],
    icon: '^',
    color: '#8b5cf6'
  },
  {
    id: 'op-not',
    name: 'FHE.not()',
    description: 'Bitwise NOT of an encrypted value',
    category: 'bitwise',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint*', 'ebool'],
    outputType: 'same-as-input',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.not({{a}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'a', label: 'Value to negate', type: 'variable', required: true }
    ],
    tags: ['not', 'bitwise', 'binary', '~', 'logic', 'negate', 'invert'],
    icon: '~',
    color: '#8b5cf6'
  },
  {
    id: 'op-shl',
    name: 'FHE.shl()',
    description: 'Shift left by encrypted amount',
    category: 'bitwise',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint*+euint8'],
    outputType: 'same-as-first',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.shl({{value}}, {{shift}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'value', label: 'Value to shift', type: 'variable', required: true },
      { id: 'shift', label: 'Shift amount', type: 'variable', required: true }
    ],
    tags: ['shl', 'shift', 'left', 'bitwise', '<<'],
    icon: '⬅️',
    color: '#8b5cf6'
  },
  {
    id: 'op-shr',
    name: 'FHE.shr()',
    description: 'Shift right by encrypted amount',
    category: 'bitwise',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint*+euint8'],
    outputType: 'same-as-first',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.shr({{value}}, {{shift}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'value', label: 'Value to shift', type: 'variable', required: true },
      { id: 'shift', label: 'Shift amount', type: 'variable', required: true }
    ],
    tags: ['shr', 'shift', 'right', 'bitwise', '>>'],
    icon: '➡️',
    color: '#8b5cf6'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CONDITIONAL
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'op-select',
    name: 'FHE.select()',
    description: 'Select between two values based on encrypted condition',
    category: 'conditional',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['ebool+euint*+euint*'],
    outputType: 'same-as-second',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.select({{condition}}, {{ifTrue}}, {{ifFalse}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'condition', label: 'Condition (ebool)', type: 'variable', variableType: 'ebool', required: true },
      { id: 'ifTrue', label: 'Value if true', type: 'variable', required: true },
      { id: 'ifFalse', label: 'Value if false', type: 'variable', required: true }
    ],
    tags: ['select', 'conditional', 'ternary', 'if', 'else', 'choose', '?:'],
    icon: '🔀',
    color: '#ec4899'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ACL OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'acl-allowThis',
    name: 'FHE.allowThis()',
    description: 'Allow this contract to use the encrypted value',
    category: 'acl',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-*'],
    template: 'FHE.allowThis({{variable}});',
    params: [
      { id: 'variable', label: 'Variable to allow', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['allowThis', 'acl', 'permission', 'access', 'contract', 'self'],
    icon: '🔓',
    color: '#ef4444'
  },
  {
    id: 'acl-allow',
    name: 'FHE.allow()',
    description: 'Allow an address to decrypt the encrypted value',
    category: 'acl',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-*'],
    template: 'FHE.allow({{variable}}, {{address}});',
    params: [
      { id: 'variable', label: 'Variable to allow', type: 'variable', variableType: 'euint*', required: true },
      { id: 'address', label: 'Address to allow', type: 'string', default: 'msg.sender', required: true }
    ],
    tags: ['allow', 'acl', 'permission', 'access', 'decrypt', 'grant'],
    icon: '🔑',
    color: '#ef4444'
  },
  {
    id: 'acl-allowTransient',
    name: 'FHE.allowTransient()',
    description: 'Allow temporary access for this transaction only',
    category: 'acl',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-*'],
    template: 'FHE.allowTransient({{variable}}, {{address}});',
    params: [
      { id: 'variable', label: 'Variable to allow', type: 'variable', variableType: 'euint*', required: true },
      { id: 'address', label: 'Address to allow', type: 'string', default: 'msg.sender', required: true }
    ],
    tags: ['allowTransient', 'acl', 'permission', 'temporary', 'transaction', 'one-time'],
    icon: '⏱️',
    color: '#ef4444'
  },
  {
    id: 'acl-isAllowed',
    name: 'FHE.isAllowed()',
    description: 'Check if an address has access to encrypted value',
    category: 'acl',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    outputType: 'bool',
    template: 'bool {{result}} = FHE.isAllowed({{variable}}, {{address}});',
    params: [
      { id: 'result', label: 'Result variable', type: 'string', default: 'hasAccess', required: true },
      { id: 'variable', label: 'Variable to check', type: 'variable', variableType: 'euint*', required: true },
      { id: 'address', label: 'Address to check', type: 'string', default: 'msg.sender', required: true }
    ],
    tags: ['isAllowed', 'acl', 'check', 'permission', 'access', 'verify'],
    icon: '❓',
    color: '#ef4444'
  },
  {
    id: 'acl-isSenderAllowed',
    name: 'FHE.isSenderAllowed()',
    description: 'Check if msg.sender has access to encrypted value',
    category: 'acl',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    outputType: 'bool',
    template: 'bool {{result}} = FHE.isSenderAllowed({{variable}});',
    params: [
      { id: 'result', label: 'Result variable', type: 'string', default: 'senderAllowed', required: true },
      { id: 'variable', label: 'Variable to check', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['isSenderAllowed', 'acl', 'check', 'sender', 'permission', 'msg.sender'],
    icon: '👤',
    color: '#ef4444'
  },
  {
    id: 'acl-makePubliclyDecryptable',
    name: 'FHE.makePubliclyDecryptable()',
    description: 'Mark handle as publicly decryptable (async decryption)',
    category: 'decrypt',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-*', 'acl-*'],
    template: 'FHE.makePubliclyDecryptable({{variable}});',
    params: [
      { id: 'variable', label: 'Variable to decrypt', type: 'variable', variableType: 'euint*', required: true }
    ],
    tags: ['makePubliclyDecryptable', 'decrypt', 'public', 'reveal', 'async'],
    icon: '🔓',
    color: '#a855f7'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RANDOM NUMBER GENERATION
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'op-randEuint8',
    name: 'FHE.randEuint8()',
    description: 'Generate random encrypted 8-bit value',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['acl-*'],
    outputType: 'euint8',
    autoAdds: ['acl-allowThis'],
    template: 'euint8 {{output}} = FHE.randEuint8();',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'random8', required: true }
    ],
    tags: ['rand', 'random', 'euint8', 'generate', 'lottery', 'game'],
    icon: '🎲',
    color: '#10b981'
  },
  {
    id: 'op-randEuint16',
    name: 'FHE.randEuint16()',
    description: 'Generate random encrypted 16-bit value',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['acl-*'],
    outputType: 'euint16',
    autoAdds: ['acl-allowThis'],
    template: 'euint16 {{output}} = FHE.randEuint16();',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'random16', required: true }
    ],
    tags: ['rand', 'random', 'euint16', 'generate', 'lottery', 'game'],
    icon: '🎲',
    color: '#10b981'
  },
  {
    id: 'op-randEuint32',
    name: 'FHE.randEuint32()',
    description: 'Generate random encrypted 32-bit value',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['acl-*'],
    outputType: 'euint32',
    autoAdds: ['acl-allowThis'],
    template: 'euint32 {{output}} = FHE.randEuint32();',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'random32', required: true }
    ],
    tags: ['rand', 'random', 'euint32', 'generate', 'lottery', 'game'],
    icon: '🎲',
    color: '#10b981'
  },
  {
    id: 'op-randEuint64',
    name: 'FHE.randEuint64()',
    description: 'Generate random encrypted 64-bit value',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['acl-*'],
    outputType: 'euint64',
    autoAdds: ['acl-allowThis'],
    template: 'euint64 {{output}} = FHE.randEuint64();',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'random64', required: true }
    ],
    tags: ['rand', 'random', 'euint64', 'generate', 'lottery', 'game'],
    icon: '🎲',
    color: '#10b981'
  },
  {
    id: 'op-randEuint32Bounded',
    name: 'FHE.randEuint32Bounded()',
    description: 'Generate random encrypted value with upper bound',
    category: 'arithmetic',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['acl-*'],
    outputType: 'euint32',
    autoAdds: ['acl-allowThis'],
    template: 'euint32 {{output}} = FHE.randEuint32Bounded({{bound}});',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'randomBounded', required: true },
      { id: 'bound', label: 'Upper bound', type: 'string', default: '100', required: true }
    ],
    tags: ['rand', 'random', 'bounded', 'range', 'lottery', 'dice', 'game'],
    icon: '🎲',
    color: '#10b981'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BIT ROTATION
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'op-rotl',
    name: 'FHE.rotl()',
    description: 'Rotate bits left',
    category: 'bitwise',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint*+euint8'],
    outputType: 'same-as-first',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.rotl({{value}}, {{amount}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'value', label: 'Value to rotate', type: 'variable', required: true },
      { id: 'amount', label: 'Rotation amount', type: 'variable', required: true }
    ],
    tags: ['rotl', 'rotate', 'left', 'bitwise', 'circular'],
    icon: '🔄',
    color: '#8b5cf6'
  },
  {
    id: 'op-rotr',
    name: 'FHE.rotr()',
    description: 'Rotate bits right',
    category: 'bitwise',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeAfter: ['op-fromExternal'],
    mustComeBefore: ['acl-*'],
    inputTypes: ['euint*+euint8'],
    outputType: 'same-as-first',
    autoAdds: ['acl-allowThis'],
    template: '{{target}} = FHE.rotr({{value}}, {{amount}});',
    params: [
      { id: 'target', label: 'Target variable', type: 'variable', required: true },
      { id: 'value', label: 'Value to rotate', type: 'variable', required: true },
      { id: 'amount', label: 'Rotation amount', type: 'variable', required: true }
    ],
    tags: ['rotr', 'rotate', 'right', 'bitwise', 'circular'],
    icon: '🔄',
    color: '#8b5cf6'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TYPE CONVERSION (Plaintext to Encrypted)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'op-asEuint8',
    name: 'FHE.asEuint8()',
    description: 'Convert plaintext uint8 to encrypted euint8',
    category: 'input-conversion',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['op-*', 'acl-*'],
    outputType: 'euint8',
    template: 'euint8 {{output}} = FHE.asEuint8({{value}});',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'eValue8', required: true },
      { id: 'value', label: 'Plaintext value', type: 'string', default: '0', required: true }
    ],
    tags: ['asEuint8', 'convert', 'encrypt', 'plaintext', 'cast'],
    icon: '🔐',
    color: '#06b6d4'
  },
  {
    id: 'op-asEuint16',
    name: 'FHE.asEuint16()',
    description: 'Convert plaintext uint16 to encrypted euint16',
    category: 'input-conversion',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['op-*', 'acl-*'],
    outputType: 'euint16',
    template: 'euint16 {{output}} = FHE.asEuint16({{value}});',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'eValue16', required: true },
      { id: 'value', label: 'Plaintext value', type: 'string', default: '0', required: true }
    ],
    tags: ['asEuint16', 'convert', 'encrypt', 'plaintext', 'cast'],
    icon: '🔐',
    color: '#06b6d4'
  },
  {
    id: 'op-asEuint32',
    name: 'FHE.asEuint32()',
    description: 'Convert plaintext uint32 to encrypted euint32',
    category: 'input-conversion',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['op-*', 'acl-*'],
    outputType: 'euint32',
    template: 'euint32 {{output}} = FHE.asEuint32({{value}});',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'eValue32', required: true },
      { id: 'value', label: 'Plaintext value', type: 'string', default: '0', required: true }
    ],
    tags: ['asEuint32', 'convert', 'encrypt', 'plaintext', 'cast'],
    icon: '🔐',
    color: '#06b6d4'
  },
  {
    id: 'op-asEuint64',
    name: 'FHE.asEuint64()',
    description: 'Convert plaintext uint64 to encrypted euint64',
    category: 'input-conversion',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['op-*', 'acl-*'],
    outputType: 'euint64',
    template: 'euint64 {{output}} = FHE.asEuint64({{value}});',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'eValue64', required: true },
      { id: 'value', label: 'Plaintext value', type: 'string', default: '0', required: true }
    ],
    tags: ['asEuint64', 'convert', 'encrypt', 'plaintext', 'cast'],
    icon: '🔐',
    color: '#06b6d4'
  },
  {
    id: 'op-asEbool',
    name: 'FHE.asEbool()',
    description: 'Convert plaintext bool to encrypted ebool',
    category: 'input-conversion',
    canDropIn: ['function-body'],
    requires: ['import-fhe'],
    mustComeBefore: ['op-*', 'acl-*'],
    outputType: 'ebool',
    template: 'ebool {{output}} = FHE.asEbool({{value}});',
    params: [
      { id: 'output', label: 'Output variable', type: 'string', default: 'eFlag', required: true },
      { id: 'value', label: 'Plaintext value', type: 'string', default: 'true', required: true }
    ],
    tags: ['asEbool', 'convert', 'encrypt', 'bool', 'boolean', 'cast'],
    icon: '🔐',
    color: '#06b6d4'
  }
];

// Export block getter functions
export function getBlockById(id: string): Block | undefined {
  return blocks.find(b => b.id === id);
}

export function getBlocksByCategory(category: string): Block[] {
  return blocks.filter(b => b.category === category);
}

export function searchBlocks(query: string): Block[] {
  const q = query.toLowerCase();
  return blocks.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.description.toLowerCase().includes(q) ||
    b.tags.some(t => t.toLowerCase().includes(q))
  );
}

export function getCategories(): string[] {
  return [...new Set(blocks.map(b => b.category))];
}
