"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import type { CodeBlock } from "@/lib/types";

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
      <div style={{ color: 'var(--fg-muted)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>loading editor...</div>
    </div>
  ),
});

interface CodeEditorProps {
  code: string;
  language: "solidity" | "typescript";
  blocks?: CodeBlock[];
  readOnly?: boolean;
}

export function CodeEditor({ code, language, blocks, readOnly = true }: CodeEditorProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hoveredBlock, setHoveredBlock] = useState<CodeBlock | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Map theme to Monaco theme
  const monacoTheme = theme === "light" ? "vs" : "vs-dark";

  if (!mounted) {
    return (
      <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        <div style={{ color: 'var(--fg-muted)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>loading editor...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Block explanations sidebar */}
      {blocks && blocks.length > 0 && hoveredBlock && (
        <div style={{
          position: 'absolute',
          right: '16px',
          top: '16px',
          zIndex: 10,
          maxWidth: '280px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="tag">{hoveredBlock.type}</span>
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              L{hoveredBlock.lines[0]}-{hoveredBlock.lines[1]}
            </span>
          </div>
          <p style={{ fontSize: '12px', lineHeight: 1.5 }}>{hoveredBlock.explanation}</p>
        </div>
      )}

      <Editor
        height="500px"
        language={language === "solidity" ? "sol" : "typescript"}
        value={code}
        theme={monacoTheme}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: "on",
          renderLineHighlight: "all",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
          padding: { top: 16, bottom: 16 },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          lineHeight: 20,
          letterSpacing: 0,
        }}
        beforeMount={(monaco) => {
          // Register Solidity language if not already registered
          if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === "sol")) {
            monaco.languages.register({ id: "sol" });
            monaco.languages.setMonarchTokensProvider("sol", {
              keywords: [
                "pragma", "solidity", "import", "contract", "interface", "library",
                "function", "modifier", "event", "struct", "enum", "mapping",
                "public", "private", "internal", "external", "view", "pure",
                "payable", "returns", "return", "if", "else", "for", "while",
                "do", "break", "continue", "throw", "emit", "require", "assert",
                "revert", "memory", "storage", "calldata", "constructor", "fallback",
                "receive", "virtual", "override", "abstract", "immutable", "constant",
                "indexed", "anonymous", "using", "is", "new", "delete", "try", "catch"
              ],
              typeKeywords: [
                "address", "bool", "string", "bytes", "byte", "int", "uint",
                "int8", "int16", "int32", "int64", "int128", "int256",
                "uint8", "uint16", "uint32", "uint64", "uint128", "uint256",
                "bytes1", "bytes2", "bytes4", "bytes8", "bytes16", "bytes32",
                "euint8", "euint16", "euint32", "euint64", "euint128", "euint256",
                "ebool", "eaddress", "externalEuint8", "externalEuint16",
                "externalEuint32", "externalEuint64", "externalEbool"
              ],
              operators: [
                "=", ">", "<", "!", "~", "?", ":", "==", "<=", ">=", "!=",
                "&&", "||", "++", "--", "+", "-", "*", "/", "&", "|", "^",
                "%", "<<", ">>", ">>>", "+=", "-=", "*=", "/=", "&=", "|=",
                "^=", "%=", "<<=", ">>=", ">>>="
              ],
              tokenizer: {
                root: [
                  [/[a-zA-Z_]\w*/, {
                    cases: {
                      "@keywords": "keyword",
                      "@typeKeywords": "type",
                      "@default": "identifier"
                    }
                  }],
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
                  [/"/, "string", "@pop"]
                ],
                comment: [
                  [/[^\/*]+/, "comment"],
                  [/\*\//, "comment", "@pop"],
                  [/[\/*]/, "comment"]
                ],
              },
            });
          }
        }}
        onMount={(_editor, monaco) => {
          // Add hover provider for blocks
          if (blocks && blocks.length > 0) {
            monaco.languages.registerHoverProvider(language === "solidity" ? "sol" : "typescript", {
              provideHover: (_model: unknown, position: { lineNumber: number }) => {
                const lineNumber = position.lineNumber;
                const block = blocks.find(
                  (b) => lineNumber >= b.lines[0] && lineNumber <= b.lines[1]
                );

                if (block) {
                  setHoveredBlock(block);
                  return {
                    contents: [
                      { value: `**${block.type.toUpperCase()}**` },
                      { value: block.explanation },
                    ],
                  };
                }

                setHoveredBlock(null);
                return null;
              },
            });
          }
        }}
      />
    </div>
  );
}
