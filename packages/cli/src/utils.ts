/**
 * CLI Utility Functions
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Get templates directory path
 */
export function getTemplatesDir(): string {
  // Check for environment variable
  if (process.env.LABZ_TEMPLATES) {
    return process.env.LABZ_TEMPLATES;
  }

  // Check for installed templates (npm package - dist/../templates)
  const packageTemplates = path.join(__dirname, '..', 'templates');
  if (fs.existsSync(packageTemplates)) {
    return packageTemplates;
  }

  // Check for local templates directory (development)
  // From packages/cli/dist -> packages/cli -> packages -> Lab-Z root
  const localTemplates = path.join(__dirname, '..', '..', '..', 'templates');
  if (fs.existsSync(localTemplates)) {
    return localTemplates;
  }

  // Default to current working directory
  return path.join(process.cwd(), 'templates');
}

/**
 * Get base-template directory path
 * This is the Hardhat template that gets cloned for each new project
 */
export function getBaseTemplatePath(): string {
  // Check for environment variable
  if (process.env.LABZ_BASE_TEMPLATE) {
    return process.env.LABZ_BASE_TEMPLATE;
  }

  // Check for installed base-template (npm package - dist/../base-template)
  const packageBase = path.join(__dirname, '..', 'base-template');
  if (fs.existsSync(packageBase)) {
    return packageBase;
  }

  // Check for local base-template directory (development)
  // From packages/cli/dist -> packages/cli -> packages -> root
  const localBase = path.join(__dirname, '..', '..', '..', 'base-template');
  if (fs.existsSync(localBase)) {
    return localBase;
  }

  // Fallback to templates/_base for backwards compatibility
  const templatesBase = path.join(getTemplatesDir(), '_base');
  if (fs.existsSync(templatesBase)) {
    return templatesBase;
  }

  // Default to current working directory
  return path.join(process.cwd(), 'base-template');
}

/**
 * Print the CLI banner
 */
export function printBanner(): void {
  console.log('');
  console.log(chalk.cyan('  ⚡ labz'));
  console.log(chalk.dim('  fhe smart contract generator'));
  console.log('');
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return chalk.green('+ ') + message;
}

/**
 * Format error message
 */
export function formatError(message: string): string {
  return chalk.red('x ') + message;
}

/**
 * Format info message
 */
export function formatInfo(message: string): string {
  return chalk.blue('> ') + message;
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow('! ') + message;
}

/**
 * Create a styled box
 */
export function createBox(content: string, title?: string): string {
  return boxen(content, {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: 'single',
    borderColor: 'gray',
    title: title,
    titleAlignment: 'left',
  });
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Pad string to fixed width
 */
export function pad(str: string, width: number, align: 'left' | 'right' = 'left'): string {
  if (str.length >= width) return str.slice(0, width);
  const padding = ' '.repeat(width - str.length);
  return align === 'left' ? str + padding : padding + str;
}

/**
 * Print a table
 */
export function printTable(headers: string[], rows: string[][], columnWidths?: number[]): void {
  const widths = columnWidths || headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map((r) => (r[i] || '').length));
    return Math.max(h.length, maxRowWidth);
  });

  // Header
  const headerRow = headers.map((h, i) => chalk.dim(pad(h, widths[i]))).join('  ');
  console.log(headerRow);

  // Separator
  const separator = widths.map((w) => '-'.repeat(w)).join('  ');
  console.log(chalk.dim(separator));

  // Rows
  for (const row of rows) {
    const formattedRow = row.map((cell, i) => pad(cell || '', widths[i])).join('  ');
    console.log(formattedRow);
  }
}

/**
 * Validate template ID
 */
export function isValidTemplateId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id);
}

/**
 * Validate project name
 */
export function isValidProjectName(name: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(name);
}
