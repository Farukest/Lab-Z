"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Info,
  Zap,
  Code,
  ArrowRight,
  SkipForward,
} from "lucide-react";
import type { editor } from "monaco-editor";
import type {
  Tutorial,
  TutorialStep as NewTutorialStep,
  TutorialSection,
  TutorialCodeRef,
} from "@/tutorials/types";
import { SmartText } from "./smart-text";
import { ArrowManagerProvider, useFlowArrow } from "./flow-arrow";
import { useCodeLocations } from "@/hooks/use-code-locations";
import { useTranslation, interpolate } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n";

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-secondary)",
      }}
    >
      <div
        style={{
          color: "var(--fg-muted)",
          fontSize: "12px",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        loading editor...
      </div>
    </div>
  ),
});

// Legacy step interface for backward compatibility
// Exported as TutorialStep for backward compatibility with tutorial-generator.ts
export interface TutorialStep {
  id: string;
  title: string;
  testLines?: [number, number];
  contractLines?: [number, number];
  explanation: string;
  concept?: {
    term: string;
    definition: string;
    example?: string;
  };
  flowDirection?: "left-to-right" | "right-to-left" | "both" | "none";
  duration?: number;
}

// Alias for clarity in this file
type LegacyTutorialStep = TutorialStep;

type TutorialMode = "lineByLine" | "fheStepsOnly";

interface InteractiveTutorialProps {
  testCode: string;
  contractCode: string;
  tutorial?: Tutorial;
  steps?: LegacyTutorialStep[]; // Backward compatibility
  templateName: string;
}

// Flatten sections into steps for navigation
function flattenTutorial(
  tutorial: Tutorial,
  mode: TutorialMode
): { step: NewTutorialStep; sectionTitle: string; sectionId: string }[] {
  const result: { step: NewTutorialStep; sectionTitle: string; sectionId: string }[] = [];

  for (const section of tutorial.sections) {
    for (const step of section.steps) {
      // In FHE-only mode, skip steps without FHE calls
      if (mode === "fheStepsOnly" && !step.fheCall) {
        continue;
      }
      result.push({
        step,
        sectionTitle: section.title,
        sectionId: section.id,
      });
    }
  }

  return result;
}

// Convert legacy step to new format
function convertLegacyStep(step: LegacyTutorialStep): NewTutorialStep {
  return {
    id: step.id,
    title: step.title,
    test: step.testLines ? { lines: step.testLines } : undefined,
    contract: step.contractLines ? { lines: step.contractLines } : undefined,
    leftExplanation: step.explanation,
    rightExplanation: undefined,
    flow:
      step.flowDirection === "left-to-right"
        ? "test-to-contract"
        : step.flowDirection === "right-to-left"
        ? "contract-to-test"
        : step.testLines && !step.contractLines
        ? "test-only"
        : !step.testLines && step.contractLines
        ? "contract-only"
        : "test-to-contract",
    concept: step.concept,
    duration: step.duration,
  };
}

// Wrapper component to provide ArrowManagerProvider context
export function InteractiveTutorial(props: InteractiveTutorialProps) {
  return (
    <ArrowManagerProvider>
      <InteractiveTutorialInner {...props} />
    </ArrowManagerProvider>
  );
}

// Step ID to translation key mapping for handle-journey
const STEP_TRANSLATION_MAP: Record<string, keyof Translations['handleJourney']['steps']> = {
  'deploy': 'deploy',
  'call-birth': 'callBirth',
  'fhe-as-euint64': 'fheAsEuint64',
  'call-birth-encrypted': 'callBirthEncrypted',
  'fhe-from-external': 'fheFromExternal',
  'call-grant-perm': 'callGrantPerm',
  'fhe-allow': 'fheAllow',
  'call-transient-perm': 'callTransientPerm',
  'fhe-allow-transient': 'fheAllowTransient',
  'call-op-add': 'callOpAdd',
  'fhe-add': 'fheAdd',
  'call-op-compare': 'callOpCompare',
  'fhe-lt': 'fheLt',
  'call-op-select': 'callOpSelect',
  'fhe-select': 'fheSelect',
  'call-store': 'callStore',
  'storage-assign': 'storageAssign',
  'call-transfer': 'callTransfer',
  'call-request-decrypt': 'callRequestDecrypt',
  'make-publicly-decryptable': 'makePubliclyDecryptable',
  'get-handle-decrypt': 'getHandleDecrypt',
  'finalize-decrypt': 'finalizeDecrypt',
};

function InteractiveTutorialInner({
  testCode,
  contractCode,
  tutorial,
  steps: legacySteps,
  templateName,
}: InteractiveTutorialProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<TutorialMode>("lineByLine");
  const [fheDetailsExpanded, setFheDetailsExpanded] = useState(false);
  const [conceptDetailsExpanded, setConceptDetailsExpanded] = useState(false);
  const [monacoInstance, setMonacoInstance] = useState<typeof import("monaco-editor") | null>(null);

  // Dynamic line resolution - auto-find function/pattern locations
  const { resolveRef } = useCodeLocations(contractCode, testCode);

  const testEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const contractEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const testDecorationsRef = useRef<string[]>([]);
  const contractDecorationsRef = useRef<string[]>([]);
  const contractEditorContainerRef = useRef<HTMLDivElement | null>(null);

  // Flow arrow hook
  const { showArrow } = useFlowArrow();

  // Extract contract name from code
  const contractName = useMemo(() => {
    const match = contractCode.match(/contract\s+(\w+)/);
    return match ? match[1] : 'Contract';
  }, [contractCode]);

  // Flatten steps based on mode
  const flattenedSteps = useMemo(() => {
    if (tutorial) {
      return flattenTutorial(tutorial, mode);
    }
    if (legacySteps) {
      return legacySteps.map((step) => ({
        step: convertLegacyStep(step),
        sectionTitle: "Tutorial",
        sectionId: "legacy",
      }));
    }
    return [];
  }, [tutorial, legacySteps, mode]);

  const currentFlatStep = currentStepIndex >= 0 ? flattenedSteps[currentStepIndex] : null;
  const currentStep = currentFlatStep?.step || null;
  const currentSection = currentFlatStep?.sectionTitle || null;

  // Get translated explanations for current step (only for handle-journey template)
  const getTranslatedExplanation = useCallback((stepId: string, side: 'left' | 'right' | 'fhe'): string | undefined => {
    // Only use translations for handle-journey template - other templates use their own leftExplanation/rightExplanation
    if (tutorial?.templateId !== 'handle-journey') return undefined;

    const translationKey = STEP_TRANSLATION_MAP[stepId];
    if (!translationKey) return undefined;

    const stepTranslations = t.handleJourney.steps[translationKey];
    if (!stepTranslations) return undefined;

    if (side === 'left') return (stepTranslations as any).leftExplanation;
    if (side === 'right') return (stepTranslations as any).rightExplanation;
    if (side === 'fhe') return (stepTranslations as any).fheDescription;
    return undefined;
  }, [t, tutorial?.templateId]);

  // Get translated concept
  const getTranslatedConcept = useCallback((conceptKey: string): { term: string; definition: string; example?: string } | undefined => {
    const concepts = t.concepts as any;
    // Map concept terms to keys
    const conceptMap: Record<string, string> = {
      'Handle': 'handle',
      'Encrypted Input': 'encryptedInput',
      'FHE.fromExternal()': 'fromExternal',
      'FHE.allowThis()': 'allowThis',
      'FHE.allow()': 'allow',
      'FHE.allowTransient()': 'allowTransient',
      'FHE.add()': 'add',
      'FHE.lt()': 'lt',
      'FHE.select()': 'select',
      'FHE.makePubliclyDecryptable()': 'makePubliclyDecryptable',
      'FHE.checkSignatures()': 'checkSignatures',
      'User Decryption': 'userDecrypt',
      'Handle Death': 'handleDeath',
    };
    const key = conceptMap[conceptKey];
    if (key && concepts[key]) {
      return concepts[key];
    }
    return undefined;
  }, [t]);

  const monacoTheme = theme === "light" ? "vs" : "vs-dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset step index when mode changes
  useEffect(() => {
    setCurrentStepIndex(-1);
    setIsPlaying(false);
  }, [mode]);

  // Update decorations when step changes
  const updateDecorations = useCallback(() => {
    if (!monacoInstance) return;

    // Clear previous decorations
    if (testEditorRef.current) {
      testDecorationsRef.current = testEditorRef.current.deltaDecorations(
        testDecorationsRef.current,
        []
      );
    }
    if (contractEditorRef.current) {
      contractDecorationsRef.current = contractEditorRef.current.deltaDecorations(
        contractDecorationsRef.current,
        []
      );
    }

    if (!currentStep) return;

    // Resolve test lines dynamically if not provided
    const resolvedTest = currentStep.test ? resolveRef(currentStep.test, false) : null;
    const resolvedContract = currentStep.contract ? resolveRef(currentStep.contract, true) : null;

    // Add test decorations
    if (resolvedTest && testEditorRef.current) {
      const [startLine, endLine] = resolvedTest.lines;
      testDecorationsRef.current = testEditorRef.current.deltaDecorations([], [
        {
          range: new monacoInstance.Range(startLine, 1, endLine, 1),
          options: {
            isWholeLine: true,
            className: "tutorial-highlight-line",
            glyphMarginClassName: "tutorial-highlight-glyph",
            linesDecorationsClassName: "tutorial-highlight-margin",
          },
        },
      ]);

      // Scroll to the highlighted line
      testEditorRef.current.revealLineInCenter(startLine);
    }

    // Add contract decorations
    if (resolvedContract && contractEditorRef.current) {
      const [startLine, endLine] = resolvedContract.lines;
      contractDecorationsRef.current = contractEditorRef.current.deltaDecorations([], [
        {
          range: new monacoInstance.Range(startLine, 1, endLine, 1),
          options: {
            isWholeLine: true,
            className: currentStep.fheCall
              ? "tutorial-highlight-line-fhe"
              : "tutorial-highlight-line",
            glyphMarginClassName: currentStep.fheCall
              ? "tutorial-highlight-glyph-fhe"
              : "tutorial-highlight-glyph",
            linesDecorationsClassName: currentStep.fheCall
              ? "tutorial-highlight-margin-fhe"
              : "tutorial-highlight-margin",
          },
        },
      ]);

      // Scroll to the highlighted line
      contractEditorRef.current.revealLineInCenter(startLine);
    } else if (!resolvedContract && contractEditorRef.current && currentStep.leftExplanation) {
      // No contract lines defined, but there's a leftExplanation
      // Try to find method name in explanation and scroll to it in contract
      const methodMatch = currentStep.leftExplanation.match(/(\w+)\s*\(\)/);
      if (methodMatch) {
        const methodName = methodMatch[1];
        const contractModel = contractEditorRef.current.getModel();
        if (contractModel) {
          // Search for function definition
          const searchResult = contractModel.findMatches(
            `function\\s+${methodName}\\s*\\(`,
            true, true, false, null, true
          );
          if (searchResult.length > 0) {
            const targetLine = searchResult[0].range.startLineNumber;
            contractEditorRef.current.revealLineInCenter(targetLine);

            // Find function end (simple heuristic: next closing brace line or +5 lines)
            const contractModel = contractEditorRef.current.getModel();
            let endLine = targetLine;
            if (contractModel) {
              const totalLines = contractModel.getLineCount();
              for (let i = targetLine; i <= Math.min(targetLine + 10, totalLines); i++) {
                const lineContent = contractModel.getLineContent(i);
                if (lineContent.trim() === '}') {
                  endLine = i;
                  break;
                }
              }
              if (endLine === targetLine) endLine = Math.min(targetLine + 3, totalLines);
            }

            // Use normal highlight style for visibility
            contractDecorationsRef.current = contractEditorRef.current.deltaDecorations([], [
              {
                range: new monacoInstance.Range(targetLine, 1, endLine, 1),
                options: {
                  isWholeLine: true,
                  className: "tutorial-highlight-line",
                  glyphMarginClassName: "tutorial-highlight-glyph",
                  linesDecorationsClassName: "tutorial-highlight-margin",
                },
              },
            ]);
          }
        }
      }
    }
  }, [currentStep, monacoInstance, resolveRef]);

  // Scroll to current step's highlighted lines (for navigation button)
  const scrollToCurrentStep = useCallback(() => {
    if (!currentStep) return;

    // Resolve lines dynamically
    const resolvedTest = currentStep.test ? resolveRef(currentStep.test, false) : null;
    const resolvedContract = currentStep.contract ? resolveRef(currentStep.contract, true) : null;

    // Scroll test editor
    if (resolvedTest && testEditorRef.current) {
      const [startLine] = resolvedTest.lines;
      testEditorRef.current.revealLineInCenter(startLine);
    }

    // Scroll contract editor
    if (resolvedContract && contractEditorRef.current) {
      const [startLine] = resolvedContract.lines;
      contractEditorRef.current.revealLineInCenter(startLine);
    }
  }, [currentStep, resolveRef]);

  // Update decorations when step changes
  useEffect(() => {
    updateDecorations();
  }, [updateDecorations]);

  // Reset expanded states when step changes
  useEffect(() => {
    setFheDetailsExpanded(false);
    setConceptDetailsExpanded(false);
  }, [currentStepIndex]);

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying || currentStepIndex >= flattenedSteps.length - 1) {
      if (currentStepIndex >= flattenedSteps.length - 1) setIsPlaying(false);
      return;
    }

    const duration = currentStep?.duration || 4000;
    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, duration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, currentStep, flattenedSteps.length]);

  const handlePlay = () => {
    if (currentStepIndex === -1 || currentStepIndex >= flattenedSteps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
  };

  const handleStepClick = (index: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(index);
  };

  const handleNextStep = () => {
    if (currentStepIndex < flattenedSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Flash highlight a method in the code
  const flashHighlightMethod = useCallback((methodName: string, isContract: boolean = true) => {
    if (!monacoInstance) return;

    const editor = isContract ? contractEditorRef.current : testEditorRef.current;
    const code = isContract ? contractCode : testCode;
    if (!editor) return;

    // Find the method in code (skip comments)
    const lines = code.split('\n');
    let targetLine = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comment lines
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        continue;
      }

      // Check if method name is in actual code (not in a comment at end of line)
      const commentIndex = line.indexOf('//');
      const codePartOnly = commentIndex > -1 ? line.substring(0, commentIndex) : line;

      if (codePartOnly.includes(methodName)) {
        targetLine = i + 1;
        break;
      }
    }

    if (targetLine === -1) return;

    // Create flash decoration
    const flashDecorations = editor.deltaDecorations([], [{
      range: new monacoInstance.Range(targetLine, 1, targetLine, 1),
      options: {
        isWholeLine: true,
        className: 'tutorial-flash-line',
        glyphMarginClassName: 'tutorial-flash-glyph',
      }
    }]);

    // Scroll to line
    editor.revealLineInCenter(targetLine);

    // Remove after animation
    setTimeout(() => {
      editor.deltaDecorations(flashDecorations, []);
    }, 600);
  }, [monacoInstance, contractCode, testCode]);

  // Handle method click from Test (left) explanation - scroll to STEP's highlighted lines (both test and contract)
  const handleMethodClick = useCallback((methodName: string, element: HTMLElement) => {
    if (!monacoInstance || !currentStep) return;

    // Use step's resolved lines instead of searching for method name
    const resolvedTest = currentStep.test ? resolveRef(currentStep.test, false) : null;
    const resolvedContract = currentStep.contract ? resolveRef(currentStep.contract, true) : null;

    // 1. Scroll test editor to step's test lines
    if (resolvedTest && testEditorRef.current) {
      const [startLine, endLine] = resolvedTest.lines;
      testEditorRef.current.revealLineInCenter(startLine);

      // Flash highlight the step's lines
      const testDecorations = testEditorRef.current.deltaDecorations([], [{
        range: new monacoInstance.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'tutorial-flash-line',
          glyphMarginClassName: 'tutorial-flash-glyph',
        }
      }]);

      setTimeout(() => {
        testEditorRef.current?.deltaDecorations(testDecorations, []);
      }, 600);
    }

    // 2. Scroll contract editor to step's contract lines
    if (resolvedContract && contractEditorRef.current) {
      const [startLine, endLine] = resolvedContract.lines;
      contractEditorRef.current.revealLineInCenter(startLine);

      // Flash highlight the step's lines
      const contractDecorations = contractEditorRef.current.deltaDecorations([], [{
        range: new monacoInstance.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'tutorial-flash-line',
          glyphMarginClassName: 'tutorial-flash-glyph',
        }
      }]);

      setTimeout(() => {
        contractEditorRef.current?.deltaDecorations(contractDecorations, []);
      }, 600);

      // Draw arrow from clicked element to contract editor
      const sourceRect = element.getBoundingClientRect();
      const from = {
        x: sourceRect.left + sourceRect.width / 2,
        y: sourceRect.bottom,
      };

      const editorDomNode = contractEditorRef.current.getDomNode();
      if (editorDomNode) {
        const editorRect = editorDomNode.getBoundingClientRect();
        const topForLine = contractEditorRef.current.getTopForLineNumber(startLine);
        const scrollTop = contractEditorRef.current.getScrollTop();
        const lineHeight = 18;
        const lineY = editorRect.top + (topForLine - scrollTop) + lineHeight / 2 + 12;

        const to = {
          x: editorRect.left + 80,
          y: Math.max(editorRect.top + 30, Math.min(lineY, editorRect.bottom - 30)),
        };

        showArrow(from, to, '#ec4899');
      }
    }
  }, [monacoInstance, currentStep, resolveRef, showArrow]);

  // Handle method click from Contract (right) explanation - scroll to STEP's highlighted lines (both test and contract)
  const handleMethodClickFromContract = useCallback((methodName: string, element: HTMLElement) => {
    if (!monacoInstance || !currentStep) return;

    // Use step's resolved lines instead of searching for method name
    const resolvedTest = currentStep.test ? resolveRef(currentStep.test, false) : null;
    const resolvedContract = currentStep.contract ? resolveRef(currentStep.contract, true) : null;

    // 1. Scroll contract editor to step's contract lines
    if (resolvedContract && contractEditorRef.current) {
      const [startLine, endLine] = resolvedContract.lines;
      contractEditorRef.current.revealLineInCenter(startLine);

      // Flash highlight the step's lines
      const contractDecorations = contractEditorRef.current.deltaDecorations([], [{
        range: new monacoInstance.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'tutorial-flash-line',
          glyphMarginClassName: 'tutorial-flash-glyph',
        }
      }]);

      setTimeout(() => {
        contractEditorRef.current?.deltaDecorations(contractDecorations, []);
      }, 600);
    }

    // 2. Scroll test editor to step's test lines
    if (resolvedTest && testEditorRef.current) {
      const [startLine, endLine] = resolvedTest.lines;
      testEditorRef.current.revealLineInCenter(startLine);

      // Flash highlight the step's lines
      const testDecorations = testEditorRef.current.deltaDecorations([], [{
        range: new monacoInstance.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'tutorial-flash-line',
          glyphMarginClassName: 'tutorial-flash-glyph',
        }
      }]);

      setTimeout(() => {
        testEditorRef.current?.deltaDecorations(testDecorations, []);
      }, 600);

      // Draw arrow from clicked element to test editor
      const sourceRect = element.getBoundingClientRect();
      const from = {
        x: sourceRect.left + sourceRect.width / 2,
        y: sourceRect.bottom,
      };

      const editorDomNode = testEditorRef.current.getDomNode();
      if (editorDomNode) {
        const editorRect = editorDomNode.getBoundingClientRect();
        const topForLine = testEditorRef.current.getTopForLineNumber(startLine);
        const scrollTop = testEditorRef.current.getScrollTop();
        const lineHeight = 18;
        const lineY = editorRect.top + (topForLine - scrollTop) + lineHeight / 2 + 12;

        const to = {
          x: editorRect.right - 80,
          y: Math.max(editorRect.top + 30, Math.min(lineY, editorRect.bottom - 30)),
        };

        showArrow(from, to, '#ec4899');
      }
    }
  }, [monacoInstance, currentStep, resolveRef, showArrow]);

  // Handle FHE call click from SmartText - scroll to STEP's highlighted contract lines
  const handleFheClick = useCallback((fheMethod: string, element: HTMLElement) => {
    if (!contractEditorRef.current || !monacoInstance || !currentStep) return;

    // Use step's resolved contract lines instead of searching for FHE method
    const resolvedContract = currentStep.contract ? resolveRef(currentStep.contract, true) : null;

    if (resolvedContract) {
      const [startLine, endLine] = resolvedContract.lines;
      contractEditorRef.current.revealLineInCenter(startLine);

      // Flash highlight the step's lines
      const contractDecorations = contractEditorRef.current.deltaDecorations([], [{
        range: new monacoInstance.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'tutorial-flash-line',
          glyphMarginClassName: 'tutorial-flash-glyph',
        }
      }]);

      setTimeout(() => {
        contractEditorRef.current?.deltaDecorations(contractDecorations, []);
      }, 600);

      // Draw arrow from clicked element to contract editor
      const sourceRect = element.getBoundingClientRect();
      const from = {
        x: sourceRect.left + sourceRect.width / 2,
        y: sourceRect.bottom,
      };

      const editorDomNode = contractEditorRef.current.getDomNode();
      if (editorDomNode) {
        const editorRect = editorDomNode.getBoundingClientRect();
        const topForLine = contractEditorRef.current.getTopForLineNumber(startLine);
        const scrollTop = contractEditorRef.current.getScrollTop();
        const lineHeight = 18;
        const lineY = editorRect.top + (topForLine - scrollTop) + lineHeight / 2 + 12;

        const to = {
          x: editorRect.left + 80,
          y: Math.max(editorRect.top + 30, Math.min(lineY, editorRect.bottom - 30)),
        };

        // Show arrow (purple color for FHE calls)
        showArrow(from, to, '#8b5cf6');
      }
    }
  }, [monacoInstance, currentStep, resolveRef, showArrow]);

  // Ref to track current step's resolved test/contract lines for click validation
  const currentStepTestLinesRef = useRef<[number, number] | null>(null);
  const currentStepContractLinesRef = useRef<[number, number] | null>(null);

  // Update refs when step changes - use resolveRef to handle all patterns (method, block+call, fheOp, etc.)
  useEffect(() => {
    const resolvedTest = currentStep?.test ? resolveRef(currentStep.test, false) : null;
    const resolvedContract = currentStep?.contract ? resolveRef(currentStep.contract, true) : null;

    currentStepTestLinesRef.current = resolvedTest?.lines || null;
    currentStepContractLinesRef.current = resolvedContract?.lines || null;
  }, [currentStep, resolveRef]);

  // Track clickable variable decorations
  const clickableVarDecorationsRef = useRef<string[]>([]);

  // Track clickable method decorations
  const testMethodDecorationsRef = useRef<string[]>([]);
  const contractMethodDecorationsRef = useRef<string[]>([]);

  // Add clickable decoration to variables in contract calls on current step's lines
  useEffect(() => {
    // Resolve test lines using resolveRef (handles block+call patterns)
    const resolvedTest = currentStep?.test ? resolveRef(currentStep.test, false) : null;

    if (!testEditorRef.current || !monacoInstance || !resolvedTest?.lines) {
      // Clear decorations if no step
      if (testEditorRef.current && clickableVarDecorationsRef.current.length > 0) {
        clickableVarDecorationsRef.current = testEditorRef.current.deltaDecorations(
          clickableVarDecorationsRef.current,
          []
        );
      }
      return;
    }

    const [startLine, endLine] = resolvedTest.lines;
    const model = testEditorRef.current.getModel();
    if (!model) return;

    const newDecorations: { range: any; options: any }[] = [];

    // Check each line in the current step
    for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
      const lineContent = model.getLineContent(lineNum);

      // Look for contract.methodName(variable) pattern
      const contractCallMatch = lineContent.match(/contract\.(\w+)\s*\(([^)]+)\)/);
      if (contractCallMatch) {
        const argsStr = contractCallMatch[2];
        // Find variable names in arguments (not numbers, not strings)
        const varPattern = /\b([a-z][a-zA-Z0-9]*)\b/g;
        let varMatch;

        while ((varMatch = varPattern.exec(argsStr)) !== null) {
          const varName = varMatch[1];
          // Skip keywords and common words
          if (['await', 'true', 'false', 'null', 'undefined', 'new'].includes(varName)) continue;

          // Find position in line
          const varIndex = lineContent.indexOf(varName, lineContent.indexOf('('));
          if (varIndex !== -1) {
            newDecorations.push({
              range: new monacoInstance.Range(lineNum, varIndex + 1, lineNum, varIndex + 1 + varName.length),
              options: {
                inlineClassName: 'clickable-variable'
              }
            });
          }
        }
      }
    }

    // Apply new decorations
    clickableVarDecorationsRef.current = testEditorRef.current.deltaDecorations(
      clickableVarDecorationsRef.current,
      newDecorations
    );
  }, [currentStep, monacoInstance, resolveRef]);

  // Handle click on method/variable in TEST editor - cross-scroll to CONTRACT
  const setupTestEditorClickHandler = useCallback((
    testEditor: editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
    testCodeStr: string,
    contractCodeStr: string,
    contractEditorGetter: () => editor.IStandaloneCodeEditor | null
  ) => {
    // Add decorations for all contract.methodName() calls
    const testModel = testEditor.getModel();
    if (testModel) {
      const methodMatches = testModel.findMatches('contract\\.(\\w+)\\s*\\(', true, true, false, null, true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decorations = methodMatches.map((match: any) => {
        // Adjust range to only cover the method name (skip 'contract.')
        const line = testModel.getLineContent(match.range.startLineNumber);
        const methodMatch = line.substring(match.range.startColumn - 1).match(/contract\.(\w+)/);
        if (methodMatch) {
          const methodStart = match.range.startColumn + 9; // 'contract.' = 9 chars
          const methodEnd = methodStart + methodMatch[1].length;
          return {
            range: new monaco.Range(match.range.startLineNumber, methodStart, match.range.startLineNumber, methodEnd),
            options: {
              inlineClassName: 'tutorial-method-clickable'
            }
          };
        }
        return null;
      }).filter((d): d is NonNullable<typeof d> => d !== null);
      testMethodDecorationsRef.current = testEditor.deltaDecorations(testMethodDecorationsRef.current, decorations);
    }

    testEditor.onMouseDown((e) => {
      // Only handle clicks on content (not gutter, etc.)
      if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) return;

      const position = e.target.position;
      if (!position) return;

      // Get the word at click position
      const wordInfo = testEditor.getModel()?.getWordAtPosition(position);
      if (!wordInfo) return;

      const clickedWord = wordInfo.word;
      const clickedLine = position.lineNumber;

      // Skip if it's a keyword or too short
      if (clickedWord.length < 2) return;

      // Skip common keywords
      const skipWords = ['const', 'let', 'var', 'await', 'async', 'function', 'return', 'if', 'else', 'for', 'while', 'true', 'false', 'null', 'undefined', 'new', 'this', 'expect', 'describe', 'it', 'before', 'after', 'contract'];
      if (skipWords.includes(clickedWord)) return;

      const testLines = testCodeStr.split('\n');
      const currentLineContent = testLines[clickedLine - 1] || '';

      const contractEditor = contractEditorGetter();
      if (!contractEditor) return;

      // Check if clicked word is a METHOD NAME in contract.methodName(...)
      const methodCallPattern = new RegExp(`contract\\.${clickedWord}\\s*\\(`);
      if (methodCallPattern.test(currentLineContent)) {
        // Clicked on a method name - scroll contract to function definition
        const contractModel = contractEditor.getModel();
        if (!contractModel) return;

        const funcSearchResult = contractModel.findMatches(`function\\s+${clickedWord}\\s*\\(`, true, true, false, null, true);
        if (funcSearchResult.length > 0) {
          // Prefer match within current step's contract lines
          let funcMatch = funcSearchResult[0];
          const stepContractLines = currentStepContractLinesRef.current;
          if (stepContractLines && funcSearchResult.length > 1) {
            const [stepStart, stepEnd] = stepContractLines;
            const matchInStep = funcSearchResult.find(
              m => m.range.startLineNumber >= stepStart && m.range.startLineNumber <= stepEnd
            );
            if (matchInStep) {
              funcMatch = matchInStep;
            }
          }
          const funcLine = funcMatch.range.startLineNumber;

          // Find the method name position in the function line
          const funcLineContent = contractModel.getLineContent(funcLine);
          const methodIndex = funcLineContent.indexOf(clickedWord);
          const methodMidCol = methodIndex + Math.floor(clickedWord.length / 2) + 1;

          // Scroll contract editor
          contractEditor.revealLineInCenter(funcLine);

          // Flash highlight
          const decorations = contractEditor.deltaDecorations([], [
            { range: funcMatch.range, options: { inlineClassName: 'tutorial-flash-inline' } }
          ]);
          setTimeout(() => contractEditor.deltaDecorations(decorations, []), 800);

          // Draw arrow - from test method to contract function middle
          const testEditorDom = testEditor.getDomNode();
          const contractEditorDom = contractEditor.getDomNode();
          if (testEditorDom && contractEditorDom) {
            const testRect = testEditorDom.getBoundingClientRect();
            const contractRect = contractEditorDom.getBoundingClientRect();

            // Source: middle of clicked method name
            const fromScrolledPos = testEditor.getScrolledVisiblePosition({
              lineNumber: clickedLine,
              column: wordInfo.startColumn + Math.floor(clickedWord.length / 2)
            });
            const fromX = fromScrolledPos ? testRect.left + fromScrolledPos.left : testRect.right - 50;
            const fromY = fromScrolledPos ? testRect.top + fromScrolledPos.top + fromScrolledPos.height / 2 : testRect.top + 100;

            // Target: middle of function name in contract
            const toScrolledPos = contractEditor.getScrolledVisiblePosition({ lineNumber: funcLine, column: methodMidCol });
            const toX = toScrolledPos ? contractRect.left + toScrolledPos.left : contractRect.left + 100;
            const toY = toScrolledPos ? contractRect.top + toScrolledPos.top + toScrolledPos.height / 2 : contractRect.top + 100;

            showArrow(
              { x: fromX, y: Math.max(testRect.top + 20, Math.min(fromY, testRect.bottom - 20)) },
              { x: toX, y: Math.max(contractRect.top + 20, Math.min(toY, contractRect.bottom - 20)) },
              '#ec4899'
            );
          }
        }
        return;
      }

      // Check if clicked word is a VARIABLE in contract.methodName(clickedWord)
      const contractCallPattern = new RegExp(`contract\\.(\\w+)\\s*\\([^)]*\\b${clickedWord}\\b`);
      const match = currentLineContent.match(contractCallPattern);

      // Only draw arrow if clicked variable is on a contract call line
      if (!match) return;

      const methodName = match[1];

      // Find the function and parameter info in contract
      const contractModel = contractEditor.getModel();
      if (!contractModel) return;

      const funcSearchResult = contractModel.findMatches(`function ${methodName}\\s*\\(`, true, true, false, null, true);
      if (funcSearchResult.length === 0) return;

      const funcMatch = funcSearchResult[0];
      const funcLine = funcMatch.range.startLineNumber;
      const funcLineContent = contractModel.getLineContent(funcLine);

      // Extract parameter info
      const paramPattern = /\(\s*\w+\s+(\w+)/;
      const paramMatch = funcLineContent.match(paramPattern);
      let paramRange: { startLine: number; startCol: number; endCol: number } | null = null;
      let paramMidCol = 1;

      if (paramMatch) {
        const paramName = paramMatch[1];
        const paramIndex = funcLineContent.indexOf(paramName, funcLineContent.indexOf('('));
        if (paramIndex !== -1) {
          paramRange = {
            startLine: funcLine,
            startCol: paramIndex + 1,
            endCol: paramIndex + 1 + paramName.length
          };
          paramMidCol = paramIndex + Math.floor(paramName.length / 2) + 1;
        }
      }

      // 1. First scroll the contract editor
      contractEditor.revealLineInCenter(funcLine);

      // 2. Flash highlight in test editor
      const testDecorations = testEditor.deltaDecorations([], [
        {
          range: new monaco.Range(clickedLine, wordInfo.startColumn, clickedLine, wordInfo.endColumn + 1),
          options: { inlineClassName: 'tutorial-flash-inline' }
        }
      ]);

      // 3. Flash highlight in contract editor
      let contractDecorations: string[];
      if (paramRange) {
        contractDecorations = contractEditor.deltaDecorations([], [
          {
            range: new monaco.Range(paramRange.startLine, paramRange.startCol, paramRange.startLine, paramRange.endCol),
            options: { inlineClassName: 'tutorial-flash-param' }
          }
        ]);
      } else {
        contractDecorations = contractEditor.deltaDecorations([], [
          {
            range: new monaco.Range(funcLine, 1, funcLine, 1),
            options: { isWholeLine: true, className: 'tutorial-flash-line' }
          }
        ]);
      }

      // 4. Draw arrow AFTER scroll completes (use requestAnimationFrame)
      requestAnimationFrame(() => {
        const testEditorDom = testEditor.getDomNode();
        const contractEditorDom = contractEditor.getDomNode();
        if (!testEditorDom || !contractEditorDom) return;

        const testRect = testEditorDom.getBoundingClientRect();
        const contractRect = contractEditorDom.getBoundingClientRect();

        // Source: middle of clicked variable
        const fromScrolledPos = testEditor.getScrolledVisiblePosition({
          lineNumber: clickedLine,
          column: wordInfo.startColumn + Math.floor(clickedWord.length / 2)
        });
        const fromX = fromScrolledPos ? testRect.left + fromScrolledPos.left : testRect.right - 50;
        const fromY = fromScrolledPos ? testRect.top + fromScrolledPos.top + fromScrolledPos.height / 2 : testRect.top + 100;

        // Target: middle of parameter in contract
        const toScrolledPos = contractEditor.getScrolledVisiblePosition({ lineNumber: funcLine, column: paramMidCol });
        const toX = toScrolledPos ? contractRect.left + toScrolledPos.left : contractRect.left + 100;
        const toY = toScrolledPos ? contractRect.top + toScrolledPos.top + toScrolledPos.height / 2 : contractRect.top + 100;

        showArrow(
          { x: fromX, y: Math.max(testRect.top + 20, Math.min(fromY, testRect.bottom - 20)) },
          { x: toX, y: Math.max(contractRect.top + 20, Math.min(toY, contractRect.bottom - 20)) },
          '#10b981'
        );
      });

      // Remove decorations after animation
      setTimeout(() => {
        testEditor.deltaDecorations(testDecorations, []);
        contractEditor.deltaDecorations(contractDecorations, []);
      }, 800);
    });
  }, [showArrow]);

  // Ref for 'this' decorations in contract editor
  const thisDecorationsRef = useRef<string[]>([]);

  // Handle click on function names in CONTRACT editor - cross-scroll to TEST
  const setupContractEditorClickHandler = useCallback((
    contractEditor: editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
    contractCodeStr: string,
    testEditorGetter: () => editor.IStandaloneCodeEditor | null
  ) => {
    const contractModel = contractEditor.getModel();

    // Add decorations for all function definitions
    if (contractModel) {
      const funcMatches = contractModel.findMatches('function\\s+(\\w+)\\s*\\(', true, true, false, null, true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const funcDecorations = funcMatches.map((match: any) => {
        const line = contractModel.getLineContent(match.range.startLineNumber);
        const funcMatch = line.match(/function\s+(\w+)/);
        if (funcMatch) {
          const funcNameStart = line.indexOf(funcMatch[1]);
          const funcNameEnd = funcNameStart + funcMatch[1].length;
          return {
            range: new monaco.Range(match.range.startLineNumber, funcNameStart + 1, match.range.startLineNumber, funcNameEnd + 1),
            options: {
              inlineClassName: 'tutorial-method-clickable'
            }
          };
        }
        return null;
      }).filter((d): d is NonNullable<typeof d> => d !== null);
      contractMethodDecorationsRef.current = contractEditor.deltaDecorations(contractMethodDecorationsRef.current, funcDecorations);

      // Add 'this' decorations
      const thisMatches = contractModel.findMatches('\\bthis\\b', true, true, false, null, true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thisDecorations = thisMatches.map((match: any) => ({
        range: match.range,
        options: {
          inlineClassName: 'tutorial-this-clickable'
        }
      }));
      thisDecorationsRef.current = contractEditor.deltaDecorations(thisDecorationsRef.current, thisDecorations);
    }

    contractEditor.onMouseDown((e) => {
      if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) return;

      const position = e.target.position;
      if (!position) return;

      const model = contractEditor.getModel();
      if (!model) return;

      const wordInfo = model.getWordAtPosition(position);
      if (!wordInfo) return;

      const clickedWord = wordInfo.word;
      const clickedLine = position.lineNumber;

      // Skip common keywords
      const skipWords = ['function', 'external', 'internal', 'public', 'private', 'view', 'pure', 'returns', 'return', 'if', 'else', 'for', 'while', 'require', 'emit', 'this', 'address', 'uint64', 'uint256', 'bool', 'bytes'];
      if (skipWords.includes(clickedWord)) return;

      const lineContent = model.getLineContent(clickedLine);

      // Check if this is a function definition line: function methodName(
      const funcDefPattern = new RegExp(`function\\s+${clickedWord}\\s*\\(`);
      if (funcDefPattern.test(lineContent)) {
        // Clicked on function name - scroll test to the call
        const testEditor = testEditorGetter();
        if (!testEditor) return;

        const testModel = testEditor.getModel();
        if (!testModel) return;

        // Search for contract.methodName( in test
        let testSearchResult = testModel.findMatches(`contract\\.${clickedWord}\\s*\\(`, true, true, false, null, true);
        if (testSearchResult.length === 0) {
          testSearchResult = testModel.findMatches(`\\.${clickedWord}\\s*\\(`, true, true, false, null, true);
        }

        if (testSearchResult.length > 0) {
          // Prefer match within current step's test lines (not just the first match!)
          let testMatch = testSearchResult[0];
          const stepTestLines = currentStepTestLinesRef.current;
          if (stepTestLines && testSearchResult.length > 1) {
            const [stepStart, stepEnd] = stepTestLines;
            const matchInStep = testSearchResult.find(
              m => m.range.startLineNumber >= stepStart && m.range.startLineNumber <= stepEnd
            );
            if (matchInStep) {
              testMatch = matchInStep;
            }
          }
          const testLine = testMatch.range.startLineNumber;

          // Find method name position in test line
          const testLineContent = testModel.getLineContent(testLine);
          const methodIndex = testLineContent.indexOf(clickedWord);
          const methodMidCol = methodIndex + Math.floor(clickedWord.length / 2) + 1;

          // Scroll test editor
          testEditor.revealLineInCenter(testLine);

          // Flash highlight
          const decorations = testEditor.deltaDecorations([], [
            { range: testMatch.range, options: { inlineClassName: 'tutorial-flash-inline' } }
          ]);
          setTimeout(() => testEditor.deltaDecorations(decorations, []), 800);

          // Draw arrow from contract function to test call - both pointing to middle
          const contractEditorDom = contractEditor.getDomNode();
          const testEditorDom = testEditor.getDomNode();
          if (contractEditorDom && testEditorDom) {
            const contractRect = contractEditorDom.getBoundingClientRect();
            const testRect = testEditorDom.getBoundingClientRect();

            // Source: middle of clicked function name
            const fromScrolledPos = contractEditor.getScrolledVisiblePosition({
              lineNumber: clickedLine,
              column: wordInfo.startColumn + Math.floor(clickedWord.length / 2)
            });
            const fromX = fromScrolledPos ? contractRect.left + fromScrolledPos.left : contractRect.left + 100;
            const fromY = fromScrolledPos ? contractRect.top + fromScrolledPos.top + fromScrolledPos.height / 2 : contractRect.top + 100;

            // Target: middle of method call in test
            const toScrolledPos = testEditor.getScrolledVisiblePosition({ lineNumber: testLine, column: methodMidCol });
            const toX = toScrolledPos ? testRect.left + toScrolledPos.left : testRect.right - 100;
            const toY = toScrolledPos ? testRect.top + toScrolledPos.top + toScrolledPos.height / 2 : testRect.top + 100;

            showArrow(
              { x: fromX, y: Math.max(contractRect.top + 20, Math.min(fromY, contractRect.bottom - 20)) },
              { x: toX, y: Math.max(testRect.top + 20, Math.min(toY, testRect.bottom - 20)) },
              '#ec4899'
            );
          }
        }
        return;
      }

      // Handle 'this' clicks - scroll to contract declaration
      if (clickedWord === 'this') {
        const contractMatch = model.findMatches('^\\s*contract\\s+\\w+', true, true, false, null, true);
        if (contractMatch.length > 0) {
          const contractLine = contractMatch[0].range.startLineNumber;
          contractEditor.revealLineInCenter(contractLine);
          const flashDecorations = contractEditor.deltaDecorations([], [
            { range: new monaco.Range(contractLine, 1, contractLine, 1), options: { isWholeLine: true, className: 'tutorial-flash-line' } }
          ]);
          setTimeout(() => contractEditor.deltaDecorations(flashDecorations, []), 1000);
        }
      }
    });
  }, [showArrow]);

  // Handle value click from SmartText - scroll to value definition in test editor
  const handleValueClick = useCallback((value: string, element: HTMLElement) => {
    // Flash the clicked element
    element.style.animation = 'none';
    element.offsetHeight; // Trigger reflow
    element.style.animation = 'flash-pulse 0.3s ease-in-out 2';

    // Scroll test editor to the value definition
    if (testEditorRef.current && monacoInstance) {
      const testModel = testEditorRef.current.getModel();
      if (testModel) {
        // Search for value definition: = 42n or = 42 (with word boundary)
        const searchResult = testModel.findMatches(`=\\s*${value}n?\\b`, true, true, false, null, true);

        if (searchResult.length > 0) {
          const match = searchResult[0];
          const testLine = match.range.startLineNumber;

          // Scroll test editor to the line
          testEditorRef.current.revealLineInCenter(testLine);

          // Find the full line to highlight the variable assignment
          const lineContent = testModel.getLineContent(testLine);
          const valueIndex = lineContent.indexOf(value);

          if (valueIndex !== -1) {
            // Highlight just the value
            const testDecorations = testEditorRef.current.deltaDecorations([], [
              {
                range: new monacoInstance.Range(testLine, valueIndex + 1, testLine, valueIndex + 1 + value.length),
                options: { inlineClassName: 'tutorial-flash-inline' }
              }
            ]);

            // Remove after animation
            setTimeout(() => {
              testEditorRef.current?.deltaDecorations(testDecorations, []);
            }, 800);
          }
        }
      }
    }
  }, [monacoInstance]);

  // Handle variable click from SmartText - scroll to variable in test editor
  const handleVariableClick = useCallback((variable: string, element: HTMLElement) => {
    // Flash the clicked element
    element.style.animation = 'none';
    element.offsetHeight; // Trigger reflow
    element.style.animation = 'flash-pulse 0.3s ease-in-out 2';

    // Scroll test editor to the variable
    if (testEditorRef.current && monacoInstance) {
      const testModel = testEditorRef.current.getModel();
      if (testModel) {
        // Search for variable usage
        const searchResult = testModel.findMatches(`\\b${variable}\\b`, true, true, false, null, true);

        if (searchResult.length > 0) {
          const match = searchResult[0];
          const testLine = match.range.startLineNumber;

          // Scroll test editor to the line
          testEditorRef.current.revealLineInCenter(testLine);

          // Highlight the variable with cyan color
          const testDecorations = testEditorRef.current.deltaDecorations([], [
            {
              range: match.range,
              options: { inlineClassName: 'tutorial-flash-variable' }
            }
          ]);

          // Remove after animation
          setTimeout(() => {
            testEditorRef.current?.deltaDecorations(testDecorations, []);
          }, 800);
        }
      }
    }
  }, [monacoInstance]);

  // Register Solidity language
  const registerSolidity = (monaco: typeof import("monaco-editor")) => {
    if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === "sol")) {
      monaco.languages.register({ id: "sol" });
      monaco.languages.setMonarchTokensProvider("sol", {
        keywords: [
          "pragma",
          "solidity",
          "import",
          "contract",
          "interface",
          "library",
          "function",
          "modifier",
          "event",
          "struct",
          "enum",
          "mapping",
          "public",
          "private",
          "internal",
          "external",
          "view",
          "pure",
          "payable",
          "returns",
          "return",
          "if",
          "else",
          "for",
          "while",
          "do",
          "break",
          "continue",
          "throw",
          "emit",
          "require",
          "assert",
          "revert",
          "memory",
          "storage",
          "calldata",
          "constructor",
          "fallback",
          "receive",
          "virtual",
          "override",
          "abstract",
          "immutable",
          "constant",
          "indexed",
          "anonymous",
          "using",
          "is",
          "new",
          "delete",
          "try",
          "catch",
        ],
        typeKeywords: [
          "address",
          "bool",
          "string",
          "bytes",
          "byte",
          "int",
          "uint",
          "int8",
          "int16",
          "int32",
          "int64",
          "int128",
          "int256",
          "uint8",
          "uint16",
          "uint32",
          "uint64",
          "uint128",
          "uint256",
          "bytes1",
          "bytes2",
          "bytes4",
          "bytes8",
          "bytes16",
          "bytes32",
          "euint8",
          "euint16",
          "euint32",
          "euint64",
          "euint128",
          "euint256",
          "ebool",
          "eaddress",
          "externalEuint8",
          "externalEuint16",
          "externalEuint32",
          "externalEuint64",
          "externalEbool",
        ],
        operators: [
          "=",
          ">",
          "<",
          "!",
          "~",
          "?",
          ":",
          "==",
          "<=",
          ">=",
          "!=",
          "&&",
          "||",
          "++",
          "--",
          "+",
          "-",
          "*",
          "/",
          "&",
          "|",
          "^",
          "%",
          "<<",
          ">>",
          ">>>",
          "+=",
          "-=",
          "*=",
          "/=",
          "&=",
          "|=",
          "^=",
          "%=",
          "<<=",
          ">>=",
          ">>>=",
        ],
        tokenizer: {
          root: [
            [
              /[a-zA-Z_]\w*/,
              {
                cases: {
                  "@keywords": "keyword",
                  "@typeKeywords": "type",
                  "@default": "identifier",
                },
              },
            ],
            [/[{}()\[\]]/, "bracket"],
            [/[<>](?!@operators)/, "bracket"],
            [/@operators/, "operator"],
            [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
            [/0[xX][0-9a-fA-F]+/, "number.hex"],
            [/\d+/, "number"],
            [/[;,.]/, "delimiter"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, "string", "@string"],
            [/\/\/.*$/, "comment"],
            [/\/\*/, "comment", "@comment"],
          ],
          string: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape"],
            [/"/, "string", "@pop"],
          ],
          comment: [
            [/[^\/*]+/, "comment"],
            [/\*\//, "comment", "@pop"],
            [/[\/*]/, "comment"],
          ],
        },
      });
    }
  };

  // Get section groups for step navigator
  const sectionGroups = useMemo(() => {
    const groups: { sectionId: string; sectionTitle: string; startIndex: number; count: number }[] =
      [];
    let currentGroup: (typeof groups)[0] | null = null;

    flattenedSteps.forEach((item, index) => {
      if (!currentGroup || currentGroup.sectionId !== item.sectionId) {
        currentGroup = {
          sectionId: item.sectionId,
          sectionTitle: item.sectionTitle,
          startIndex: index,
          count: 1,
        };
        groups.push(currentGroup);
      } else {
        currentGroup.count++;
      }
    });

    return groups;
  }, [flattenedSteps]);

  if (!mounted) {
    return (
      <div
        style={{
          height: "500px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-secondary)",
        }}
      >
        <div
          style={{
            color: "var(--fg-muted)",
            fontSize: "12px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          loading tutorial...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* CSS for highlights */}
      <style>{`
        .tutorial-highlight-line {
          background: rgba(255, 208, 0, 0.15) !important;
        }
        .tutorial-highlight-margin {
          background: #ffd000 !important;
          width: 4px !important;
        }
        .tutorial-highlight-glyph {
          background: #ffd000;
        }
        .tutorial-highlight-line-fhe {
          background: rgba(139, 92, 246, 0.2) !important;
        }
        .tutorial-highlight-margin-fhe {
          background: #8b5cf6 !important;
          width: 4px !important;
        }
        .tutorial-highlight-glyph-fhe {
          background: #8b5cf6;
        }
        /* Subtle highlight for auto-scroll without explicit contract lines */
        .tutorial-highlight-line-subtle {
          background: rgba(156, 163, 175, 0.1) !important;
        }
        .tutorial-highlight-margin-subtle {
          background: rgba(156, 163, 175, 0.4) !important;
          width: 3px !important;
        }
        /* Flash animation for click-to-highlight */
        @keyframes flash-pulse {
          0% { background: rgba(255, 208, 0, 0.6); }
          50% { background: rgba(255, 208, 0, 0.3); }
          100% { background: rgba(255, 208, 0, 0.6); }
        }
        .tutorial-flash-line {
          animation: flash-pulse 0.3s ease-in-out 2;
          background: rgba(255, 208, 0, 0.5) !important;
        }
        .tutorial-flash-glyph {
          background: #ffd000;
          animation: flash-pulse 0.3s ease-in-out 2;
        }
        /* Inline flash for clicked variables */
        .tutorial-flash-inline {
          background: rgba(245, 158, 11, 0.4) !important;
          border-radius: 2px;
          animation: flash-pulse 0.3s ease-in-out 2;
        }
        /* Green flash for contract parameter */
        .tutorial-flash-param {
          background: rgba(16, 185, 129, 0.5) !important;
          border-radius: 2px;
          animation: flash-pulse-green 0.3s ease-in-out 2;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }
        @keyframes flash-pulse-green {
          0%, 100% { background: rgba(16, 185, 129, 0.5); }
          50% { background: rgba(16, 185, 129, 0.8); }
        }
        /* Cyan flash for variables */
        .tutorial-flash-variable {
          background: rgba(6, 182, 212, 0.4) !important;
          border-radius: 2px;
          animation: flash-pulse-cyan 0.3s ease-in-out 2;
        }
        @keyframes flash-pulse-cyan {
          0%, 100% { background: rgba(6, 182, 212, 0.4); }
          50% { background: rgba(6, 182, 212, 0.7); }
        }
        /* Clickable variable in editor - shows it can be clicked */
        .clickable-variable {
          text-decoration: underline dashed rgba(16, 185, 129, 0.7);
          text-underline-offset: 3px;
          cursor: pointer;
          border-radius: 2px;
          background: rgba(16, 185, 129, 0.1);
        }
        .clickable-variable:hover {
          background: rgba(16, 185, 129, 0.25);
        }
        /* Clickable 'this' keyword in contract editor */
        .tutorial-this-clickable {
          text-decoration: underline dotted rgba(251, 146, 60, 0.7);
          text-underline-offset: 2px;
          cursor: pointer;
          border-radius: 2px;
          background: rgba(251, 146, 60, 0.1);
        }
        .tutorial-this-clickable:hover {
          background: rgba(251, 146, 60, 0.3);
        }
        /* Clickable method names - cross-editor navigation */
        .tutorial-method-clickable {
          text-decoration: underline dashed rgba(236, 72, 153, 0.6);
          text-underline-offset: 3px;
          cursor: pointer;
          border-radius: 2px;
          background: rgba(236, 72, 153, 0.08);
        }
        .tutorial-method-clickable:hover {
          background: rgba(236, 72, 153, 0.2);
          text-decoration: underline solid rgba(236, 72, 153, 0.8);
        }
      `}</style>

      {/* Header with controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderBottom: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Zap style={{ width: "16px", height: "16px", color: "var(--accent)" }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {tutorial?.title || templateName}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--fg-muted)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {currentStepIndex >= 0
              ? `Step ${currentStepIndex + 1}/${flattenedSteps.length}`
              : t.tutorial.ready}
          </span>
          {currentSection && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--accent)",
                background: "var(--bg)",
                padding: "2px 8px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {currentSection}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Mode toggle */}
          {tutorial?.modes && (
            <div
              style={{
                display: "flex",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                marginRight: "8px",
              }}
            >
              <button
                onClick={() => setMode("lineByLine")}
                style={{
                  padding: "4px 8px",
                  background: mode === "lineByLine" ? "var(--accent)" : "transparent",
                  color: mode === "lineByLine" ? "#000" : "var(--fg-muted)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Line by Line - All steps"
              >
                <Code style={{ width: "10px", height: "10px" }} />
                All
              </button>
              <button
                onClick={() => setMode("fheStepsOnly")}
                style={{
                  padding: "4px 8px",
                  background: mode === "fheStepsOnly" ? "var(--accent)" : "transparent",
                  color: mode === "fheStepsOnly" ? "#000" : "var(--fg-muted)",
                  border: "none",
                  borderLeft: "1px solid var(--border)",
                  cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="FHE Steps Only"
              >
                <SkipForward style={{ width: "10px", height: "10px" }} />
                FHE
              </button>
            </div>
          )}

          {/* Prev/Next */}
          <button
            onClick={handlePrevStep}
            disabled={currentStepIndex <= 0}
            style={{
              padding: "6px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              cursor: currentStepIndex <= 0 ? "not-allowed" : "pointer",
              opacity: currentStepIndex <= 0 ? 0.5 : 1,
              color: "var(--fg)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronLeft style={{ width: "14px", height: "14px" }} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "var(--accent)",
              color: "#000",
              border: "none",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {isPlaying ? (
              <Pause style={{ width: "12px", height: "12px" }} />
            ) : (
              <Play style={{ width: "12px", height: "12px" }} />
            )}
            {isPlaying ? t.tutorial.pause : t.tutorial.play}
          </button>

          <button
            onClick={handleNextStep}
            disabled={currentStepIndex >= flattenedSteps.length - 1}
            style={{
              padding: "6px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              cursor: currentStepIndex >= flattenedSteps.length - 1 ? "not-allowed" : "pointer",
              opacity: currentStepIndex >= flattenedSteps.length - 1 ? 0.5 : 1,
              color: "var(--fg)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronRight style={{ width: "14px", height: "14px" }} />
          </button>

          <button
            onClick={handleReset}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              color: "var(--fg-muted)",
            }}
            title="Reset"
          >
            <RotateCcw style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      </div>

      {/* Lifecycle Stages - Only show for tutorials with lifecycle sections */}
      {(() => {
        const lifecycleStages = [
          { id: 'birth', title: 'Birth', description: 'Handle creation' },
          { id: 'permission', title: 'Permission', description: 'ACL grants' },
          { id: 'operation', title: 'Operation', description: 'FHE operations' },
          { id: 'storage', title: 'Storage', description: 'State persistence' },
          { id: 'death', title: 'Death', description: 'Decryption' },
        ];

        // Check if tutorial has lifecycle-related sections
        const hasLifecycle = tutorial?.sections?.some(s =>
          lifecycleStages.some(stage => s.id.toLowerCase().includes(stage.id))
        );

        if (!hasLifecycle) return null;

        // Find which lifecycle stage is active based on current section
        const currentSectionId = currentFlatStep?.sectionId?.toLowerCase() || '';
        const activeStageIndex = lifecycleStages.findIndex(stage =>
          currentSectionId.includes(stage.id)
        );

        return (
          <div
            style={{
              display: 'flex',
              gap: '2px',
              background: 'var(--border)',
              padding: '1px',
              border: '1px solid var(--border)',
              borderTop: 'none',
            }}
          >
            {lifecycleStages.map((stage, idx) => {
              const isActive = idx === activeStageIndex;
              return (
                <div
                  key={stage.id}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'var(--bg)',
                    textAlign: 'center',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: '2px',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}>
                    {idx + 1}. {stage.title}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: 'all 0.15s ease',
                  }}>
                    {stage.description}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Section-based step navigator */}
      <div
        style={{
          padding: "8px 12px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderTop: "none",
          borderBottom: "none",
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", gap: "40px", alignItems: "flex-end" }}>
          {sectionGroups.map((group, groupIdx) => {
            const isActiveSection = currentFlatStep?.sectionId === group.sectionId;
            return (
              <div key={group.sectionId} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isActiveSection ? "var(--fg)" : "var(--border)",
                      borderRadius: "50%",
                      fontSize: "10px",
                      fontWeight: 600,
                      color: isActiveSection ? "var(--bg)" : "var(--fg-muted)",
                      fontFamily: "'JetBrains Mono', monospace",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {groupIdx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: isActiveSection ? "var(--fg)" : "var(--fg-muted)",
                      fontFamily: "'JetBrains Mono', monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: isActiveSection ? 600 : 500,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {group.sectionTitle}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  {Array.from({ length: group.count }).map((_, i) => {
                    const stepIndex = group.startIndex + i;
                    const flatStep = flattenedSteps[stepIndex];
                    const isCurrent = currentStepIndex === stepIndex;
                    const hasFHE = !!flatStep?.step.fheCall;

                    return (
                      <button
                        key={flatStep?.step.id || i}
                        onClick={() => handleStepClick(stepIndex)}
                        title={flatStep?.step.title}
                        style={{
                          width: "32px",
                          height: "32px",
                          padding: 0,
                          background: isCurrent
                            ? "var(--bg)"
                            : hasFHE
                            ? "rgba(139, 92, 246, 0.2)"
                            : "var(--bg-secondary)",
                          color: isCurrent ? "var(--fg)" : hasFHE ? "#a78bfa" : "var(--fg-muted)",
                          border: isCurrent
                            ? "2px solid var(--fg)"
                            : hasFHE
                            ? "1px solid #8b5cf6"
                            : "1px solid var(--border)",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "12px",
                          fontWeight: isCurrent ? 700 : 500,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                          boxShadow: isCurrent ? "0 0 0 2px var(--bg), 0 0 0 4px var(--fg-muted)" : "none",
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content: Test | Contract */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: "1px solid var(--border)",
        }}
      >
        {/* Test Code (Left) */}
        <div style={{ borderRight: "1px solid var(--border)" }}>
          <div
            style={{
              padding: "8px 16px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              test.ts
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {currentStep?.test?.method && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--accent)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {currentStep.test.method}()
                </span>
              )}
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--fg-muted)",
                  background: "var(--bg)",
                  padding: "2px 6px",
                }}
              >
                {t.tutorial.clientLabel}
              </span>
            </div>
          </div>
          <Editor
            height="500px"
            language="typescript"
            value={testCode}
            theme={monacoTheme}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: "on",
              renderLineHighlight: "none",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 12, bottom: 12 },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
              lineHeight: 18,
              glyphMargin: true,
              stickyScroll: { enabled: false },
              hover: { enabled: false },
            }}
            onMount={(editor, monaco) => {
              testEditorRef.current = editor;
              setMonacoInstance(monaco);
              updateDecorations();
              // Setup click handler: test variable → contract method
              setupTestEditorClickHandler(
                editor,
                monaco,
                testCode,
                contractCode,
                () => contractEditorRef.current
              );
            }}
          />
        </div>

        {/* Contract Code (Right) */}
        <div>
          <div
            style={{
              padding: "8px 16px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {contractName}.sol
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {currentStep?.contract?.method && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--accent)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {currentStep.contract.method}()
                </span>
              )}
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--fg-muted)",
                  background: "var(--bg)",
                  padding: "2px 6px",
                }}
              >
                {t.tutorial.onChainLabel}
              </span>
            </div>
          </div>
          <Editor
            height="500px"
            language="sol"
            value={contractCode}
            theme={monacoTheme}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: "on",
              renderLineHighlight: "none",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              padding: { top: 12, bottom: 12 },
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
              lineHeight: 18,
              glyphMargin: true,
              stickyScroll: { enabled: false },
              hover: { enabled: false },
            }}
            beforeMount={(monaco) => {
              registerSolidity(monaco);
            }}
            onMount={(editor, monaco) => {
              contractEditorRef.current = editor;
              setMonacoInstance(monaco);
              updateDecorations();
              // Setup click handler: function name → test call, 'this' → contract declaration
              setupContractEditorClickHandler(editor, monaco, contractCode, () => testEditorRef.current);
            }}
          />
        </div>
      </div>

      {/* Dual Explanation panel */}
      {currentStep && (
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns:
              currentStep.flow === "test-only"
                ? "1fr"
                : currentStep.flow === "contract-only"
                ? "1fr"
                : "1fr auto 1fr",
            border: "1px solid var(--border)",
            borderTop: "none",
            background: "var(--bg-secondary)",
          }}
        >
          {/* Left explanation (Test) */}
          {(currentStep.flow === "test-only" ||
            currentStep.flow === "test-to-contract" ||
            currentStep.flow === "contract-to-test") &&
            currentStep.leftExplanation && (
              <div
                style={{
                  padding: "16px",
                  borderRight:
                    currentStep.flow !== "test-only" ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "var(--fg-muted)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {t.tutorial.testPanel}
                  </span>
                  {currentStep.test?.lines && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--accent)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      L{currentStep.test.lines[0]}-{currentStep.test.lines[1]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--fg)" }}>
                  <SmartText
                    text={getTranslatedExplanation(currentStep.id, 'left') || currentStep.leftExplanation}
                    onMethodClick={handleMethodClick}
                    onFheClick={handleFheClick}
                    onValueClick={handleValueClick}
                    onVariableClick={handleVariableClick}
                  />
                </div>
              </div>
            )}

          {/* Flow arrow (center) - clickable to scroll to current step */}
          {(currentStep.flow === "test-to-contract" ||
            currentStep.flow === "contract-to-test") && (
            <button
              onClick={scrollToCurrentStep}
              title={t.tutorial.goToStep}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 16px",
                background: "var(--bg)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) (icon as SVGElement).style.transform = currentStep.flow === "contract-to-test" ? "rotate(180deg) scale(1.2)" : "scale(1.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg)";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) (icon as SVGElement).style.transform = currentStep.flow === "contract-to-test" ? "rotate(180deg)" : "none";
              }}
            >
              <ArrowRight
                style={{
                  width: "20px",
                  height: "20px",
                  color: "var(--accent)",
                  transform:
                    currentStep.flow === "contract-to-test" ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          )}

          {/* Navigation arrow for single-sided flows (far right, same as center arrow) */}
          {(currentStep.flow === "test-only" || currentStep.flow === "contract-only") && (
            <button
              onClick={scrollToCurrentStep}
              title={t.tutorial.goToStep}
              style={{
                position: "absolute",
                right: "0",
                top: "0",
                bottom: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                background: "var(--bg)",
                border: "none",
                borderLeft: "1px solid var(--border)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) (icon as SVGElement).style.transform = "scale(1.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg)";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) (icon as SVGElement).style.transform = "none";
              }}
            >
              <ArrowRight
                style={{
                  width: "20px",
                  height: "20px",
                  color: "var(--accent)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          )}

          {/* Right explanation (Contract) */}
          {(currentStep.flow === "contract-only" ||
            currentStep.flow === "test-to-contract" ||
            currentStep.flow === "contract-to-test") &&
            currentStep.rightExplanation && (
              <div style={{ padding: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "var(--fg-muted)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {t.tutorial.contractPanel}
                  </span>
                  {currentStep.contract?.lines && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--accent)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      L{currentStep.contract.lines[0]}-{currentStep.contract.lines[1]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--fg)" }}>
                  <SmartText
                    text={getTranslatedExplanation(currentStep.id, 'right') || currentStep.rightExplanation}
                    onMethodClick={handleMethodClickFromContract}
                    onFheClick={handleFheClick}
                    onValueClick={handleValueClick}
                    onVariableClick={handleVariableClick}
                  />
                </div>
              </div>
            )}
        </div>
      )}

      {/* FHE Call badge with Concept as expandable detail */}
      {currentStep?.fheCall && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(139, 92, 246, 0.1)",
            border: "1px solid var(--border)",
            borderTop: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  padding: "4px 8px",
                  background: "#8b5cf6",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                FHE
              </div>
              <div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#8b5cf6",
                  }}
                >
                  {currentStep.fheCall.name}
                </span>
                {(getTranslatedExplanation(currentStep.id, 'fhe') || currentStep.fheCall.description) && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--fg-muted)",
                      marginLeft: "8px",
                    }}
                  >
                    - {getTranslatedExplanation(currentStep.id, 'fhe') || currentStep.fheCall.description}
                  </span>
                )}
              </div>
            </div>
            {currentStep.concept && (
              <button
                onClick={() => setFheDetailsExpanded(!fheDetailsExpanded)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8b5cf6",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                {fheDetailsExpanded ? t.tutorial.collapse : t.tutorial.expand}
              </button>
            )}
          </div>
          {/* Concept as expandable detail */}
          {fheDetailsExpanded && currentStep.concept && (() => {
            const translatedConcept = getTranslatedConcept(currentStep.concept.term);
            const term = translatedConcept?.term || currentStep.concept.term;
            const definition = translatedConcept?.definition || currentStep.concept.definition;
            const example = translatedConcept?.example || currentStep.concept.example;
            return (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(139, 92, 246, 0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Info style={{ width: "12px", height: "12px", color: "var(--accent)" }} />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--accent)",
                    }}
                  >
                    {term}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--fg-muted)", lineHeight: 1.5 }}>
                  {definition}
                </p>
                {example && (
                  <code
                    style={{
                      display: "block",
                      marginTop: "8px",
                      padding: "8px",
                      background: "var(--bg)",
                      fontSize: "11px",
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--fg)",
                      borderLeft: "2px solid var(--border)",
                    }}
                  >
                    {example}
                  </code>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Initial state message */}
      {currentStepIndex === -1 && (
        <div
          style={{
            padding: "24px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderTop: "none",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--fg-muted)", fontSize: "12px", marginBottom: "12px" }}>
            {t.tutorial.clickPlayToStart}
          </p>
          <p style={{ color: "var(--fg-muted)", fontSize: "11px", marginBottom: "16px" }}>
            {tutorial?.description || interpolate(t.tutorial.learnStepByStep, { name: templateName })}
          </p>
          <button
            onClick={handlePlay}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "var(--accent)",
              color: "#000",
              border: "none",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <Play style={{ width: "12px", height: "12px" }} />
            {t.tutorial.startTutorial}
          </button>
        </div>
      )}
    </div>
  );
}
