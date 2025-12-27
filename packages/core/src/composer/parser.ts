/**
 * Template Parser
 *
 * Parses template files with {{SLOT}} syntax and extracts slot information.
 */

import type { SlotMode, SlotDefinition, SlotInjection } from './types';

// Regex to match slot patterns
// Supports: {{SLOT_NAME}} or {{SLOT_NAME:mode}}
const SLOT_REGEX = /\{\{([A-Z_][A-Z0-9_]*)(?::([a-z]+))?\}\}/g;

// Regex for type parameters: [[TYPE_PARAM]]
const TYPE_PARAM_REGEX = /\[\[([A-Z_][A-Z0-9_]*)\]\]/g;

export interface ParsedSlot {
  name: string;
  mode: SlotMode;
  position: number;
  length: number;
  line: number;
  fullMatch: string;
}

export interface ParseResult {
  slots: ParsedSlot[];
  typeParams: string[];
  content: string;
}

/**
 * Parse a template string and extract all slots
 */
export function parseTemplate(template: string): ParseResult {
  const slots: ParsedSlot[] = [];
  const typeParams: Set<string> = new Set();

  // Find all slots
  let match: RegExpExecArray | null;

  // Reset regex state
  SLOT_REGEX.lastIndex = 0;

  while ((match = SLOT_REGEX.exec(template)) !== null) {
    const slotName = match[1];
    const modeStr = match[2] || 'append';
    const mode = parseSlotMode(modeStr);

    // Calculate line number
    const beforeMatch = template.substring(0, match.index);
    const line = (beforeMatch.match(/\n/g) || []).length + 1;

    slots.push({
      name: slotName,
      mode,
      position: match.index,
      length: match[0].length,
      line,
      fullMatch: match[0]
    });
  }

  // Find all type parameters
  TYPE_PARAM_REGEX.lastIndex = 0;

  while ((match = TYPE_PARAM_REGEX.exec(template)) !== null) {
    typeParams.add(match[1]);
  }

  return {
    slots,
    typeParams: Array.from(typeParams),
    content: template
  };
}

/**
 * Parse slot mode from string
 */
function parseSlotMode(mode: string): SlotMode {
  switch (mode.toLowerCase()) {
    case 'append':
      return 'append';
    case 'prepend':
      return 'prepend';
    case 'replace':
      return 'replace';
    case 'once':
      return 'once';
    default:
      return 'append';
  }
}

/**
 * Apply injections to a template
 */
export function applyInjections(
  template: string,
  injections: SlotInjection[]
): string {
  // Group injections by slot
  const bySlot = new Map<string, SlotInjection[]>();

  for (const injection of injections) {
    const existing = bySlot.get(injection.slotName) || [];
    existing.push(injection);
    bySlot.set(injection.slotName, existing);
  }

  // Sort injections within each slot by order
  for (const [, slotInjections] of bySlot) {
    slotInjections.sort((a, b) => a.order - b.order);
  }

  // Replace slots with injected content
  let result = template;

  // Process from end to start to preserve positions
  const parsed = parseTemplate(template);
  const slotsReversed = [...parsed.slots].sort((a, b) => b.position - a.position);

  for (const slot of slotsReversed) {
    const slotInjections = bySlot.get(slot.name) || [];
    let replacement = '';

    if (slotInjections.length === 0) {
      // No injection for this slot - remove the marker
      replacement = '';
    } else {
      // Combine injections based on mode (trimEnd only to preserve leading indentation)
      const contents = slotInjections.map(inj => inj.content.trimEnd());

      switch (slot.mode) {
        case 'replace':
          // Last injection wins
          replacement = contents[contents.length - 1] || '';
          break;

        case 'once':
          // First injection wins
          replacement = contents[0] || '';
          break;

        case 'prepend':
          // Reverse order for prepend
          replacement = contents.reverse().join('\n');
          break;

        case 'append':
        default:
          replacement = contents.join('\n');
          break;
      }
    }

    // Replace the slot marker
    result =
      result.substring(0, slot.position) +
      replacement +
      result.substring(slot.position + slot.length);
  }

  return result;
}

/**
 * Apply type parameters to a template
 */
export function applyTypeParams(
  template: string,
  params: { [key: string]: string }
): string {
  let result = template;

  for (const [param, value] of Object.entries(params)) {
    const regex = new RegExp(`\\[\\[${param}\\]\\]`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * Get list of unique slot names from a template
 */
export function getSlotNames(template: string): string[] {
  const parsed = parseTemplate(template);
  const names = new Set(parsed.slots.map(s => s.name));
  return Array.from(names);
}

/**
 * Check if a template has a specific slot
 */
export function hasSlot(template: string, slotName: string): boolean {
  const parsed = parseTemplate(template);
  return parsed.slots.some(s => s.name === slotName);
}

/**
 * Get slot info from template
 */
export function getSlotInfo(template: string, slotName: string): ParsedSlot | null {
  const parsed = parseTemplate(template);
  return parsed.slots.find(s => s.name === slotName) || null;
}

/**
 * Validate that all required slots are present
 */
export function validateSlots(
  template: string,
  requiredSlots: string[]
): { valid: boolean; missing: string[] } {
  const parsed = parseTemplate(template);
  const availableSlots = new Set(parsed.slots.map(s => s.name));
  const missing = requiredSlots.filter(s => !availableSlots.has(s));

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Clean up empty lines after slot removal
 */
export function cleanupEmptyLines(content: string): string {
  // Remove multiple consecutive empty lines
  return content.replace(/\n{3,}/g, '\n\n');
}

/**
 * Indent content to match surrounding code
 */
export function indentContent(content: string, indent: string): string {
  const lines = content.split('\n');
  return lines.map((line, i) => (i === 0 ? line : indent + line)).join('\n');
}

/**
 * Detect indentation at a position in template
 */
export function detectIndent(template: string, position: number): string {
  // Find the start of the current line
  let lineStart = position;
  while (lineStart > 0 && template[lineStart - 1] !== '\n') {
    lineStart--;
  }

  // Extract leading whitespace
  const lineContent = template.substring(lineStart, position);
  const match = lineContent.match(/^(\s*)/);
  return match ? match[1] : '';
}
