"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface CLIConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateName: string;
  projectName?: string;
}

interface LogLine {
  text: string;
  type: "command" | "info" | "success" | "error" | "dim";
}

// Convert template name to PascalCase for file names
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export function CLIConsole({ isOpen, onClose, templateId, templateName, projectName }: CLIConsoleProps) {
  const effectiveProjectName = projectName || `${templateId}-project`;
  const contractName = toPascalCase(templateName);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Scroll to bottom when new lines are added
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [lines]);

  // Type a line character by character
  const typeLine = useCallback((line: LogLine, delay: number = 30): Promise<void> => {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const text = line.text;

      const typeChar = () => {
        if (currentIndex <= text.length) {
          setLines(prev => {
            const newLines = [...prev];
            const lastLine = newLines[newLines.length - 1];
            if (lastLine && lastLine.type === line.type) {
              newLines[newLines.length - 1] = { ...line, text: text.slice(0, currentIndex) };
            } else {
              newLines.push({ ...line, text: text.slice(0, currentIndex) });
            }
            return newLines;
          });
          currentIndex++;
          animationRef.current = window.setTimeout(typeChar, delay);
        } else {
          resolve();
        }
      };

      // Start with empty line
      setLines(prev => [...prev, { ...line, text: "" }]);
      animationRef.current = window.setTimeout(typeChar, delay);
    });
  }, []);

  // Add a line instantly
  const addLine = useCallback((line: LogLine): Promise<void> => {
    return new Promise((resolve) => {
      setLines(prev => [...prev, line]);
      animationRef.current = window.setTimeout(resolve, 100);
    });
  }, []);

  // Run the build simulation
  const runBuildSimulation = useCallback(async () => {
    setLines([]);
    setIsTyping(true);
    setIsComplete(false);

    // Type command
    await typeLine({ text: `$ labz build ${templateId}`, type: "command" }, 40);
    await new Promise(r => setTimeout(r, 300));

    // Initializing
    await addLine({ text: "", type: "info" });
    await addLine({ text: "Lab-Z v1.0.0", type: "dim" });
    await addLine({ text: "", type: "info" });
    await new Promise(r => setTimeout(r, 200));

    // Loading template
    await addLine({ text: `Loading template: ${templateName}...`, type: "info" });
    await new Promise(r => setTimeout(r, 400));
    await addLine({ text: "  Template found in registry", type: "dim" });
    await new Promise(r => setTimeout(r, 200));

    // Generating files
    await addLine({ text: "", type: "info" });
    await addLine({ text: "Generating project files...", type: "info" });
    await new Promise(r => setTimeout(r, 300));

    const files = [
      `contracts/${contractName}.sol`,
      `test/${contractName}.test.ts`,
      "hardhat.config.ts",
      "package.json",
      "README.md"
    ];

    for (const file of files) {
      await addLine({ text: `  + ${file}`, type: "success" });
      await new Promise(r => setTimeout(r, 150));
    }

    await new Promise(r => setTimeout(r, 300));

    // Compiling
    await addLine({ text: "", type: "info" });
    await addLine({ text: "Compiling contracts...", type: "info" });
    await new Promise(r => setTimeout(r, 600));
    await addLine({ text: "  Solidity 0.8.24 (solc-js)", type: "dim" });
    await new Promise(r => setTimeout(r, 200));
    await addLine({ text: "  Compilation successful", type: "success" });
    await new Promise(r => setTimeout(r, 300));

    // Running tests
    await addLine({ text: "", type: "info" });
    await addLine({ text: "Running tests...", type: "info" });
    await new Promise(r => setTimeout(r, 400));

    const tests = [
      "should deploy correctly",
      "should handle encrypted inputs",
      "should perform FHE operations",
      "should manage permissions"
    ];

    for (const test of tests) {
      await addLine({ text: `    ${test}`, type: "success" });
      await new Promise(r => setTimeout(r, 200));
    }

    await new Promise(r => setTimeout(r, 300));
    await addLine({ text: "", type: "info" });
    await addLine({ text: `  ${tests.length} passing (2.1s)`, type: "success" });
    await new Promise(r => setTimeout(r, 400));

    // Complete
    await addLine({ text: "", type: "info" });
    await addLine({ text: "Build complete!", type: "success" });
    await addLine({ text: `Project ready: ./${templateId}-project/`, type: "dim" });
    await addLine({ text: "", type: "info" });

    setIsTyping(false);
    setIsComplete(true);
  }, [templateId, templateName, typeLine, addLine]);

  // Start simulation when opened
  useEffect(() => {
    if (isOpen) {
      runBuildSimulation();
    } else {
      // Cleanup on close
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      setLines([]);
      setIsComplete(false);
      setIsTyping(false);
      setDownloadError(null);
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isOpen, runBuildSimulation]);

  // Handle download
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const url = projectName
        ? `/api/download/${templateId}?name=${encodeURIComponent(projectName)}`
        : `/api/download/${templateId}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Template "${templateId}" not available for download`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${effectiveProjectName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadError(error instanceof Error ? error.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease-out"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .cli-cursor {
          display: inline-block;
          width: 8px;
          height: 14px;
          background: var(--accent);
          margin-left: 2px;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          width: "90%",
          maxWidth: "700px",
          maxHeight: "80vh",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          overflow: "hidden",
          animation: "slideUp 0.3s ease-out",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f56" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27c93f" }} />
            </div>
            <span style={{
              marginLeft: "12px",
              fontSize: "12px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--fg-muted)"
            }}>
              Lab-Z CLI
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--fg-muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Console Output */}
        <div
          ref={consoleRef}
          style={{
            flex: 1,
            padding: "16px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            lineHeight: 1.6,
            overflowY: "auto",
            background: "#0d0d0d"
          }}
        >
          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                color:
                  line.type === "command" ? "#00ff88" :
                  line.type === "success" ? "#00ff88" :
                  line.type === "error" ? "#ff5555" :
                  line.type === "dim" ? "#666" :
                  "#ccc",
                whiteSpace: "pre-wrap"
              }}
            >
              {line.text}
              {index === lines.length - 1 && isTyping && (
                <span className="cli-cursor" />
              )}
            </div>
          ))}
          {!isTyping && isComplete && (
            <div style={{ marginTop: "8px" }}>
              <span className="cli-cursor" />
            </div>
          )}
        </div>

        {/* Footer with Download */}
        {isComplete && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
              animation: "fadeIn 0.3s ease-out"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: downloadError ? "#ff5555" : "#00ff88" }}>
              {downloadError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <span style={{ fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
                {downloadError || "Build successful"}
              </span>
            </div>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "13px",
                fontFamily: "'JetBrains Mono', monospace",
                cursor: isDownloading ? "wait" : "pointer",
                opacity: isDownloading ? 0.7 : 1
              }}
            >
              {isDownloading ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={14} />
                  {downloadError ? "Retry Download" : "Download .zip"}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
