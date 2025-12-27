'use client';

/**
 * Code Preview Component
 *
 * Real-time generated Solidity code preview with code guide
 */

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  Copy,
  Check,
  Download,
  FileCode,
  FileText,
  Settings2,
  ChevronRight,
  ChevronLeft,
  Info
} from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { generateProject, generateContractWithMapping, type BlockLineMapping, getBlockById } from '@labz/core/blocks';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type PreviewTab = 'contract' | 'test' | 'deploy';

interface CodeSection {
  title: string;
  description: string;
  lineStart: number;
  lineEnd: number;
  color: string;
  /** Zone type for highlighting in middle panel */
  zoneType?: 'imports' | 'state' | 'function';
  /** Function id if this is a function section */
  functionId?: string;
}

/**
 * Render a block template with config values
 */
function renderBlockCode(blockId: string, config: Record<string, string>): string {
  const block = getBlockById(blockId);
  if (!block) return '';

  let result = block.template;
  for (const [key, value] of Object.entries(config)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
  }
  return result;
}

/**
 * Merge template code with newly added blocks
 * Inserts new blocks into the original template at the right positions
 */
function mergeTemplateWithNewBlocks(
  templateCode: string,
  functions: Array<{ id: string; body: Array<{ id: string; blockId: string; config: Record<string, string> }>; endLine?: number }>
): string {
  const lines = templateCode.split('\n');

  // Collect insertions: { lineIndex: number, code: string }[]
  const insertions: { lineIndex: number; code: string }[] = [];

  for (const fn of functions) {
    // Find new blocks (those without config.line - not from original parse)
    const newBlocks = fn.body.filter(b => !b.config?.line);

    if (newBlocks.length === 0) continue;

    // Generate code for new blocks
    const newCode = newBlocks
      .map(b => '        ' + renderBlockCode(b.blockId, b.config))
      .join('\n');

    // Find insertion point (before function's closing brace)
    if (fn.endLine && fn.endLine > 0) {
      // Insert before the closing brace of the function
      insertions.push({ lineIndex: fn.endLine - 1, code: newCode });
    }
  }

  // Sort insertions by line index descending (so we don't mess up indices)
  insertions.sort((a, b) => b.lineIndex - a.lineIndex);

  // Apply insertions
  for (const ins of insertions) {
    lines.splice(ins.lineIndex, 0, ins.code);
  }

  return lines.join('\n');
}

// Dynamic tips that rotate
const FHE_TIPS = [
  { tip: 'Add state variables before operations', category: 'basics' },
  { tip: 'Use fromExternal() to convert client inputs', category: 'input' },
  { tip: 'Always call FHE.allowThis() before storing', category: 'acl' },
  { tip: 'Every FHE operation creates a NEW handle', category: 'concept' },
  { tip: 'FHE.select() is the encrypted if/else', category: 'operations' },
  { tip: 'Comparison results are ebool (encrypted)', category: 'types' },
  { tip: 'Handle = pointer to encrypted data', category: 'concept' },
  { tip: 'Use FHE.allow() for permanent permissions', category: 'acl' },
  { tip: 'allowTransient = only this transaction', category: 'acl' },
  { tip: 'Decrypt is async: request → callback', category: 'decrypt' },
  { tip: 'euint64 is the most common FHE type', category: 'types' },
  { tip: 'Client-side encryption = true privacy', category: 'input' },
  { tip: 'FHE.mul() is the most expensive operation', category: 'gas' },
  { tip: 'Coprocessor stores all encrypted data', category: 'infra' },
];

export function CodePreview() {
  const { project, highlightedBlockId, setHighlightedBlockId, loadedTemplate, selectFunction } = useProjectStore();
  const [activeTab, setActiveTab] = useState<PreviewTab>('contract');
  const [tipIndex, setTipIndex] = useState(0);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % FHE_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  const [copied, setCopied] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canShowGuide, setCanShowGuide] = useState(true);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // Auto-collapse guide when panel is too narrow (but never auto-expand)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      // Code Structure is 256px (w-64), need at least 250px for editor = 506px minimum
      const hasSpace = width >= 600;

      setCanShowGuide(hasSpace);

      // Auto-collapse when too narrow
      if (!hasSpace && guideExpanded) {
        setGuideExpanded(false);
      }
      // Note: Never auto-expand - user must manually expand
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [guideExpanded]);

  // Show guide only if expanded AND there's enough space
  const showGuide = guideExpanded && canShowGuide;

  // Generate code with line mappings
  const generatedCodeWithMapping = useMemo(() => {
    return generateContractWithMapping(project);
  }, [project]);

  const generatedCode = useMemo(() => {
    const files = generateProject(project);

    // If a template is loaded, merge it with any new blocks added manually
    if (loadedTemplate) {
      const mergedContract = mergeTemplateWithNewBlocks(
        loadedTemplate.contractCode,
        project.functions
      );

      return {
        contract: mergedContract,
        test: loadedTemplate.testCode,
        deploy: '// Deploy script for loaded template\n// Run: npx hardhat run scripts/deploy.ts --network sepolia'
      };
    }

    // No template - use generated code
    return {
      contract: generatedCodeWithMapping.code,
      test: files[`test/${project.name}.test.ts`] || '',
      deploy: files['scripts/deploy.ts'] || ''
    };
  }, [project, generatedCodeWithMapping, loadedTemplate]);

  const currentCode = generatedCode[activeTab];

  // Handle editor mount
  const handleEditorMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);

  // Handle highlight when highlightedBlockId changes
  useEffect(() => {
    if (!highlightedBlockId || !editorRef.current || !monacoRef.current) return;
    if (activeTab !== 'contract') {
      // Switch to contract tab when highlighting
      setActiveTab('contract');
    }

    let lineStart: number | undefined;
    let lineEnd: number | undefined;

    if (loadedTemplate) {
      // For loaded templates, find line info from project blocks or functions
      const allBlocks = [
        ...project.imports,
        ...project.stateVariables,
        ...project.functions.flatMap(f => f.body)
      ];
      const block = allBlocks.find(b => b.id === highlightedBlockId);
      if (block?.config?.line) {
        lineStart = parseInt(block.config.line, 10);
        lineEnd = lineStart;
      }
    } else {
      // For generated code, use mappings
      const mapping = generatedCodeWithMapping.mappings.find(
        m => m.blockId === highlightedBlockId
      );
      if (mapping) {
        lineStart = mapping.lineStart;
        lineEnd = mapping.lineEnd;
      } else {
        // Check if it's a function ID - search for function name in code
        const fn = project.functions.find(f => f.id === highlightedBlockId);
        if (fn) {
          const lines = generatedCodeWithMapping.code.split('\n');
          const fnLineIndex = lines.findIndex(line => line.includes(`function ${fn.name}(`));
          if (fnLineIndex >= 0) {
            lineStart = fnLineIndex + 1;
            // Find function end (closing brace at same indentation)
            let braceCount = 0;
            let started = false;
            for (let i = fnLineIndex; i < lines.length; i++) {
              for (const char of lines[i]) {
                if (char === '{') { braceCount++; started = true; }
                if (char === '}') braceCount--;
              }
              if (started && braceCount === 0) {
                lineEnd = i + 1;
                break;
              }
            }
            if (!lineEnd) lineEnd = lineStart;
          }
        }
      }
    }

    if (!lineStart) {
      setHighlightedBlockId(null);
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Scroll to the line
    editor.revealLineInCenter(lineStart);

    // Add highlight decoration
    const newDecorations = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(
          lineStart,
          1,
          lineEnd || lineStart,
          1
        ),
        options: {
          isWholeLine: true,
          className: 'highlighted-code-line',
          glyphMarginClassName: 'highlighted-code-glyph'
        }
      }
    ]);
    decorationsRef.current = newDecorations;

    // Clear highlight after 2 seconds
    const timer = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
      setHighlightedBlockId(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [highlightedBlockId, generatedCodeWithMapping, activeTab, setHighlightedBlockId, loadedTemplate, project]);

  // Analyze code to create guide sections
  const codeSections = useMemo((): CodeSection[] => {
    if (activeTab !== 'contract') return [];

    const lines = currentCode.split('\n');
    const sections: CodeSection[] = [];
    let currentLine = 1;

    // Find SPDX and pragma
    const pragmaEnd = lines.findIndex((l, i) => i > 0 && l.trim() === '') + 1;
    if (pragmaEnd > 0) {
      sections.push({
        title: 'License & Pragma',
        description: 'SPDX license identifier and Solidity version. Required for all contracts.',
        lineStart: 1,
        lineEnd: pragmaEnd,
        color: 'text-neutral-400'
      });
    }

    // Find imports
    const importStart = lines.findIndex(l => l.startsWith('import'));
    if (importStart >= 0) {
      const importEnd = lines.findIndex((l, i) => i > importStart && !l.startsWith('import') && l.trim() !== '');
      sections.push({
        title: 'Imports',
        description: 'FHE library imports for encrypted types and operations.',
        lineStart: importStart + 1,
        lineEnd: importEnd > 0 ? importEnd : importStart + project.imports.length,
        color: 'text-purple-400',
        zoneType: 'imports'
      });
    }

    // Find contract declaration
    const contractStart = lines.findIndex(l => l.startsWith('contract'));
    if (contractStart >= 0) {
      sections.push({
        title: 'Contract Declaration',
        description: `Contract ${project.name} inheriting from ${project.inherits.join(', ') || 'no parents'}.`,
        lineStart: contractStart + 1,
        lineEnd: contractStart + 1,
        color: 'text-cyan-400'
      });
    }

    // Find state variables
    if (project.stateVariables.length > 0) {
      const stateStart = lines.findIndex(l => l.includes('euint') || l.includes('ebool') || l.includes('eaddress'));
      if (stateStart >= 0) {
        sections.push({
          title: 'State Variables',
          description: `${project.stateVariables.length} encrypted state variable(s) for storing FHE data.`,
          lineStart: stateStart + 1,
          lineEnd: stateStart + project.stateVariables.length,
          color: 'text-blue-400',
          zoneType: 'state'
        });
      }
    }

    // Find functions
    project.functions.forEach((fn, idx) => {
      const fnStart = lines.findIndex((l, i) => l.includes(`function ${fn.name}`));
      if (fnStart >= 0) {
        const fnEnd = lines.findIndex((l, i) => i > fnStart && l.trim() === '}' && !l.includes('if') && !l.includes('for'));
        sections.push({
          title: `Function: ${fn.name}()`,
          description: `${fn.visibility} function with ${fn.body.length} operation(s).`,
          lineStart: fnStart + 1,
          lineEnd: fnEnd > 0 ? fnEnd + 1 : fnStart + fn.body.length + 2,
          color: 'text-green-400',
          zoneType: 'function',
          functionId: fn.id
        });
      }
    });

    return sections;
  }, [currentCode, activeTab, project]);

  // Handle section click - highlight in editor and scroll middle panel
  const handleSectionClick = useCallback((section: CodeSection) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    // Scroll and highlight in editor
    editor.revealLineInCenter(section.lineStart);
    const newDecorations = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(section.lineStart, 1, section.lineEnd, 1),
        options: {
          isWholeLine: true,
          className: 'highlighted-code-line',
          glyphMarginClassName: 'highlighted-code-glyph'
        }
      }
    ]);
    decorationsRef.current = newDecorations;

    // Clear after 2s
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    }, 2000);

    // Also highlight in middle panel based on zone type
    if (section.zoneType === 'function' && section.functionId) {
      selectFunction(section.functionId);
      setHighlightedBlockId(section.functionId);
    } else if (section.zoneType === 'imports' && project.imports.length > 0) {
      setHighlightedBlockId(project.imports[0].id);
    } else if (section.zoneType === 'state' && project.stateVariables.length > 0) {
      setHighlightedBlockId(project.stateVariables[0].id);
    }
  }, [project, selectFunction, setHighlightedBlockId]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const files = generateProject(project);
    const zip = new JSZip();

    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${project.name.toLowerCase()}-project.zip`);
  };

  const tabs: { id: PreviewTab; label: string; icon: typeof FileCode }[] = [
    { id: 'contract', label: 'Contract', icon: FileCode },
    { id: 'test', label: 'Test', icon: FileText },
    { id: 'deploy', label: 'Deploy', icon: Settings2 }
  ];

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-neutral-900 border-l border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded
                transition-colors
                ${activeTab === tab.id
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
                }
              `}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-neutral-500
                     hover:text-white transition-colors"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* File Path */}
      <div className="px-4 py-1.5 text-xs font-mono border-b border-neutral-800/50 flex items-center justify-between">
        <span className="text-neutral-600">
          {activeTab === 'contract' && `contracts/${project.name}.sol`}
          {activeTab === 'test' && `test/${project.name}.test.ts`}
          {activeTab === 'deploy' && 'scripts/deploy.ts'}
        </span>
        {loadedTemplate && (
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-[10px] bg-blue-500/10 px-2 py-0.5 rounded">
              Template: {loadedTemplate.name}
            </span>
            <button
              onClick={() => useProjectStore.getState().setLoadedTemplate(null)}
              className="text-neutral-500 hover:text-red-400 text-[10px]"
              title="Clear template"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Guide Panel - Expanded */}
        {activeTab === 'contract' && showGuide && (
          <div className="w-64 border-r border-neutral-800 overflow-y-auto bg-neutral-950/50 flex-shrink-0">
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
                <Info size={12} />
                Code Structure
              </div>
              <button
                onClick={() => setGuideExpanded(false)}
                className="p-1 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                title="Collapse"
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="p-2 space-y-1">
              {codeSections.length === 0 ? (
                <p className="text-xs text-neutral-600 p-2">
                  Add blocks to see code structure
                </p>
              ) : (
                codeSections.map((section, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSectionClick(section)}
                    className="p-2 rounded bg-neutral-800/50 hover:bg-neutral-700 transition-all cursor-pointer border border-transparent hover:border-neutral-600 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${section.color} group-hover:underline`}>
                        {section.title}
                      </span>
                      <span className="text-[10px] text-neutral-600 font-mono group-hover:text-neutral-400">
                        L{section.lineStart}-{section.lineEnd}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Dynamic Tips Feed */}
            <div className="p-3 border-t border-neutral-800 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wide">💡 FHE Tip</p>
                <span className="text-[9px] text-neutral-600">{tipIndex + 1}/{FHE_TIPS.length}</span>
              </div>
              <div
                key={tipIndex}
                className="p-2 bg-neutral-800/50 rounded border border-neutral-700/50 animate-fadeIn"
              >
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  {FHE_TIPS[tipIndex].tip}
                </p>
                <span className="text-[9px] text-neutral-600 mt-1 inline-block">
                  #{FHE_TIPS[tipIndex].category}
                </span>
              </div>
              <div className="flex gap-1 mt-2 justify-center">
                {FHE_TIPS.slice(0, 7).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTipIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === tipIndex ? 'bg-blue-500' : 'bg-neutral-700 hover:bg-neutral-600'
                    }`}
                  />
                ))}
                <span className="text-[9px] text-neutral-600 ml-1">...</span>
              </div>
            </div>
          </div>
        )}

        {/* Code Guide Panel - Collapsed (expand button) */}
        {activeTab === 'contract' && !showGuide && (
          <div className="flex-shrink-0 border-r border-neutral-800 bg-neutral-950/50">
            <button
              onClick={() => setGuideExpanded(true)}
              disabled={!canShowGuide}
              className={`h-full px-1.5 flex flex-col items-center justify-center gap-1 transition-colors
                ${canShowGuide
                  ? 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-700 cursor-not-allowed'}`}
              title={canShowGuide ? 'Expand code guide' : 'Panel too narrow'}
            >
              <ChevronRight size={14} />
              <span className="text-[10px] writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
                Guide
              </span>
            </button>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            language={activeTab === 'contract' ? 'sol' : 'typescript'}
            value={currentCode}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              renderLineHighlight: 'none',
              padding: { top: 16, bottom: 16 },
              wordWrap: 'on',
              glyphMargin: true
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-900/80">
        <div className="flex justify-between items-center text-xs text-neutral-600">
          <span>{currentCode.split('\n').length} lines</span>
          <span className="font-mono">
            {activeTab === 'contract' ? 'Solidity ^0.8.24' : 'TypeScript'}
          </span>
        </div>
      </div>
    </div>
  );
}
