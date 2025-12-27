/**
 * Project Generator
 * Creates new projects from templates
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type {
  Template,
  GeneratorOptions,
  GeneratorResult,
  HubConfig,
} from '../types';
import type { TemplateRegistry } from '../registry';

export class ProjectGenerator {
  private registry: TemplateRegistry;
  private config: HubConfig;

  constructor(registry: TemplateRegistry, config: HubConfig) {
    this.registry = registry;
    this.config = config;
  }

  /**
   * Generate a new project from a template
   */
  async generate(options: GeneratorOptions): Promise<GeneratorResult> {
    const { templateId, outputDir, projectName, variables = {}, skipInstall, skipGit } = options;

    // Get template
    const template = this.registry.get(templateId);
    if (!template) {
      return {
        success: false,
        outputPath: '',
        files: [],
        error: `Template not found: ${templateId}`,
      };
    }

    const finalProjectName = projectName || template.id;
    const outputPath = path.join(outputDir, finalProjectName);

    try {
      // Check if output directory already exists
      if (await fs.pathExists(outputPath)) {
        return {
          success: false,
          outputPath,
          files: [],
          error: `Directory already exists: ${outputPath}`,
        };
      }

      // Copy base template
      await fs.copy(this.config.baseTemplatePath, outputPath);

      // Copy contract file
      const contractDir = path.join(outputPath, 'contracts');
      await fs.ensureDir(contractDir);

      const contractFileName = this.getContractFileName(template);
      const contractPath = path.join(contractDir, contractFileName);
      const processedContract = this.processTemplate(template.contractCode, {
        ...variables,
        projectName: finalProjectName,
        contractName: this.extractContractName(template.contractCode),
      });
      await fs.writeFile(contractPath, processedContract);

      // Copy test file
      if (template.testCode) {
        const testDir = path.join(outputPath, 'test');
        await fs.ensureDir(testDir);

        const testFileName = contractFileName.replace('.sol', '.test.ts');
        const testPath = path.join(testDir, testFileName);
        const processedTest = this.processTemplate(template.testCode, {
          ...variables,
          projectName: finalProjectName,
          contractName: this.extractContractName(template.contractCode),
        });
        await fs.writeFile(testPath, processedTest);
      }

      // Generate README
      const readmePath = path.join(outputPath, 'README.md');
      const readmeContent = this.generateReadme(template, finalProjectName);
      await fs.writeFile(readmePath, readmeContent);

      // Update package.json with project name
      const packageJsonPath = path.join(outputPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.name = finalProjectName;
        packageJson.description = template.description;
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }

      // Collect generated files
      const files = await this.collectFiles(outputPath);

      return {
        success: true,
        outputPath,
        files,
      };
    } catch (error) {
      return {
        success: false,
        outputPath,
        files: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process template with variable substitution
   */
  private processTemplate(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(pattern, value);
    }
    return result;
  }

  /**
   * Extract contract name from Solidity code
   */
  private extractContractName(code: string): string {
    const match = code.match(/contract\s+(\w+)/);
    return match ? match[1] : 'Contract';
  }

  /**
   * Get contract file name from template
   */
  private getContractFileName(template: Template): string {
    const contractName = this.extractContractName(template.contractCode);
    return `${contractName}.sol`;
  }

  /**
   * Generate README content for the project
   */
  private generateReadme(template: Template, projectName: string): string {
    const contractName = this.extractContractName(template.contractCode);
    const difficultyEmoji = {
      beginner: '🟢',
      intermediate: '🟡',
      advanced: '🔴',
    }[template.difficulty];

    let readme = `# ${projectName}

${difficultyEmoji} **${template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)}** | 📁 **${template.category}**

${template.description}

## Overview

${template.longDescription || template.description}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run tests
npx hardhat test

# Compile contracts
npx hardhat compile
\`\`\`

## Contract: ${contractName}

\`\`\`solidity
${template.contractCode}
\`\`\`

## Code Explanation

`;

    // Add block explanations
    for (const block of template.blocks || []) {
      readme += `### ${block.type.charAt(0).toUpperCase() + block.type.slice(1)} (Lines ${block.lines[0]}-${block.lines[1]})

${block.explanation}

`;
    }

    // Add tags
    if (template.tags.length > 0) {
      readme += `## Tags

${template.tags.map((t) => `\`${t}\``).join(' ')}\n\n`;
    }

    // Add related templates
    if (template.relatedTemplates && template.relatedTemplates.length > 0) {
      readme += `## Related Examples

${template.relatedTemplates.map((t) => `- ${t}`).join('\n')}\n\n`;
    }

    // Add next steps
    if (template.nextSteps && template.nextSteps.length > 0) {
      readme += `## Next Steps

After understanding this example, check out:

${template.nextSteps.map((t) => `- ${t}`).join('\n')}\n\n`;
    }

    readme += `---

Generated with [Lab-Z](https://github.com/Lab-Z)
`;

    return readme;
  }

  /**
   * Collect all files in a directory
   */
  private async collectFiles(dir: string, base = ''): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = path.join(base, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          files.push(...(await this.collectFiles(path.join(dir, entry.name), relativePath)));
        }
      } else {
        files.push(relativePath);
      }
    }

    return files;
  }

  /**
   * Generate documentation for a template
   */
  generateDocs(template: Template): string {
    const contractName = this.extractContractName(template.contractCode);

    let docs = `---
title: ${template.name}
category: ${template.category}
difficulty: ${template.difficulty}
tags: [${template.tags.join(', ')}]
---

# ${template.name}

${template.description}

## Contract

\`\`\`solidity
${template.contractCode}
\`\`\`

## Detailed Explanation

`;

    for (const block of template.blocks || []) {
      docs += `### ${block.type}: Lines ${block.lines[0]}-${block.lines[1]}

${block.explanation}

**Related concepts:** ${block.searchTerms.join(', ')}

`;
    }

    if (template.testCode) {
      docs += `## Tests

\`\`\`typescript
${template.testCode}
\`\`\`

`;
    }

    return docs;
  }
}

/**
 * Create a generator instance
 */
export function createGenerator(
  registry: TemplateRegistry,
  config: HubConfig
): ProjectGenerator {
  return new ProjectGenerator(registry, config);
}
