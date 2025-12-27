import { useMemo } from 'react';
import { CodeLocator, parseTestBlocks, findCallInTestBlock } from '@/lib/code-parser';
import type { TutorialCodeRef, TutorialStep, TutorialSection } from '@/tutorials/types';

export interface ResolvedCodeRef {
  lines: [number, number];
  method?: string;
}

/**
 * Hook to resolve dynamic line references in tutorials
 *
 * Takes contract and test code, returns functions to resolve
 * TutorialCodeRef objects to actual line numbers.
 */
export function useCodeLocations(contractCode: string, testCode: string) {
  const contractLocator = useMemo(() => new CodeLocator(contractCode), [contractCode]);
  const testLocator = useMemo(() => new CodeLocator(testCode), [testCode]);
  const testBlocks = useMemo(() => parseTestBlocks(testCode), [testCode]);

  /**
   * Resolve a TutorialCodeRef to actual line numbers
   */
  const resolveRef = useMemo(() => {
    return (ref: TutorialCodeRef | undefined, isContract: boolean): ResolvedCodeRef | null => {
      if (!ref) return null;

      const locator = isContract ? contractLocator : testLocator;

      // If explicit lines provided, use them (legacy support)
      if (ref.lines) {
        return { lines: ref.lines, method: ref.method };
      }

      // NEW: Find by block + call (best for test code)
      // Example: { block: 'should create a market', call: 'createMarket' }
      // This finds the createMarket() call INSIDE the it() block
      if (ref.block && ref.call && !isContract) {
        const line = findCallInTestBlock(testCode, ref.block, ref.call);
        if (line > 0) {
          return { lines: [line, line], method: ref.call };
        }
      }

      // Find by method name
      if (ref.method) {
        const funcLines = locator.getFunction(ref.method);
        if (funcLines) {
          return { lines: funcLines, method: ref.method };
        }

        // For test, try to find in test blocks
        if (!isContract) {
          const block = testBlocks.get(ref.method);
          if (block) {
            return { lines: [block.startLine, block.endLine], method: ref.method };
          }
        }
      }

      // Find by FHE operation
      if (ref.fheOp) {
        const line = locator.findFHECall(ref.fheOp);
        if (line > 0) {
          return { lines: [line, line], method: `FHE.${ref.fheOp}` };
        }
      }

      // Find by pattern
      if (ref.pattern) {
        const line = locator.findLine(new RegExp(ref.pattern));
        if (line > 0) {
          return { lines: [line, line] };
        }
      }

      return null;
    };
  }, [contractLocator, testLocator, testBlocks, testCode]);

  /**
   * Resolve all steps in a tutorial section
   */
  const resolveSection = useMemo(() => {
    return (section: TutorialSection): TutorialSection => {
      return {
        ...section,
        steps: section.steps.map(step => resolveStep(step))
      };
    };
  }, []);

  /**
   * Resolve a single tutorial step
   */
  const resolveStep = (step: TutorialStep): TutorialStep & {
    resolvedContract?: ResolvedCodeRef;
    resolvedTest?: ResolvedCodeRef;
  } => {
    const resolvedContract = resolveRef(step.contract, true);
    const resolvedTest = resolveRef(step.test, false);

    // Also resolve FHE call line if not specified
    let fheCall = step.fheCall;
    if (fheCall && !fheCall.line) {
      const opName = fheCall.name.replace('FHE.', '');
      const line = contractLocator.findFHECall(opName);
      if (line > 0) {
        fheCall = { ...fheCall, line };
      }
    }

    return {
      ...step,
      fheCall,
      resolvedContract: resolvedContract || undefined,
      resolvedTest: resolvedTest || undefined,
      // Keep original refs but add resolved versions
      contract: step.contract ? {
        ...step.contract,
        lines: resolvedContract?.lines || step.contract.lines
      } : undefined,
      test: step.test ? {
        ...step.test,
        lines: resolvedTest?.lines || step.test.lines
      } : undefined
    };
  };

  /**
   * Get all function locations for debugging
   */
  const debugLocations = () => {
    console.log('=== Contract Functions ===');
    contractLocator.getAllFunctions().forEach(f => {
      console.log(`  ${f.name}: ${f.startLine}-${f.endLine}`);
    });
    console.log('=== Contract Sections ===');
    contractLocator.getAllSections().forEach(s => {
      console.log(`  ${s.id}: ${s.startLine}-${s.endLine}`);
    });
    console.log('=== Test Blocks ===');
    testBlocks.forEach((block, name) => {
      console.log(`  "${name}": ${block.startLine}-${block.endLine}`);
    });
  };

  return {
    resolveRef,
    resolveStep,
    resolveSection,
    contractLocator,
    testLocator,
    debugLocations
  };
}
