"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Download, Terminal, Loader2 } from "lucide-react";

interface InteractiveCLIProps {
  isOpen: boolean;
  onClose: () => void;
  initialCommand?: string;
}

interface LogLine {
  text: string;
  type: "input" | "output" | "error" | "success" | "dim";
}

// Available commands and templates for autocomplete
const COMMANDS = ["labz", "clear", "ls", "pwd", "whoami", "date", "echo", "exit", "help"];
const LABZ_COMMANDS = ["create", "build", "--help", "-h"];
const BUILD_FLAGS = ["--with", "-w", "--list-bases", "--list-modules"];

export function InteractiveCLI({ isOpen, onClose, initialCommand = "" }: InteractiveCLIProps) {
  const [input, setInput] = useState(initialCommand);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [zipData, setZipData] = useState<{ base64: string; fileName: string } | null>(null);
  const [templates, setTemplates] = useState<string[]>([]);
  const [bases, setBases] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [height, setHeight] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load templates for autocomplete
  useEffect(() => {
    fetch("/api/cli/create").then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {});
    fetch("/api/cli/build").then(r => r.json()).then(d => {
      setBases(d.bases || []);
      setModules(d.modules || []);
    }).catch(() => {});
  }, []);

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newHeight = e.clientY - rect.top;
      if (newHeight >= 300 && newHeight <= window.innerHeight * 0.9) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Auto-scroll
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      if (initialCommand) {
        setInput(initialCommand);
      }
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialCommand]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setLogs([]);
      setZipData(null);
      setInput("");
    }
  }, [isOpen]);

  const addLog = useCallback((text: string, type: LogLine["type"] = "output") => {
    setLogs(prev => [...prev, { text, type }]);
  }, []);

  const parseCommand = (cmd: string): { command: string; args: Record<string, string | string[]>; error?: string } | null => {
    const parts = cmd.trim().split(/\s+/);
    if (parts[0] !== "labz") return null;

    const command = parts[1];
    const args: Record<string, string | string[]> = {};

    let i = 2;
    while (i < parts.length) {
      if (parts[i] === "--with" || parts[i] === "-w") {
        const nextVal = parts[++i];
        if (!nextVal || nextVal.startsWith("-")) {
          return { command, args, error: `Flag "${parts[i-1]}" requires a value` };
        }
        if (!args.with) args.with = [];
        (args.with as string[]).push(nextVal);
      } else if (parts[i] === "--type" || parts[i] === "-t") {
        const nextVal = parts[++i];
        if (!nextVal || nextVal.startsWith("-")) {
          return { command, args, error: `Flag "${parts[i-1]}" requires a value` };
        }
        args.type = nextVal;
      } else if (parts[i] === "--output" || parts[i] === "-o") {
        const nextVal = parts[++i];
        if (!nextVal || nextVal.startsWith("-")) {
          return { command, args, error: `Flag "${parts[i-1]}" requires a value` };
        }
        args.output = nextVal;
      } else if (parts[i] === "--list" || parts[i] === "-l") {
        args.list = "true";
      } else if (parts[i] === "--list-bases") {
        args.listBases = "true";
      } else if (parts[i] === "--list-modules") {
        args.listModules = "true";
      } else if (parts[i] === "--help" || parts[i] === "-h") {
        args.help = "true";
      } else if (parts[i].startsWith("-")) {
        // Unknown flag
        return { command, args, error: `Unknown flag: ${parts[i]}` };
      } else {
        if (!args.template) {
          args.template = parts[i];
        } else if (!args.projectName) {
          args.projectName = parts[i];
        }
      }
      i++;
    }

    return { command, args };
  };

  const showHelp = () => {
    addLog("", "output");
    addLog("Lab-Z CLI - FHE Smart Contract Generator", "success");
    addLog("", "output");
    addLog("LABZ COMMANDS:", "output");
    addLog("  labz create <template> [name]    Create project from template", "dim");
    addLog("  labz build <base> [name]         Build with composable modules", "dim");
    addLog("  labz create --list               List all templates (" + templates.length + " available)", "dim");
    addLog("  labz build --list-bases          List base templates (" + bases.length + " available)", "dim");
    addLog("  labz build --list-modules        List modules (" + modules.length + " available)", "dim");
    addLog("", "output");
    addLog("BUILD OPTIONS:", "output");
    addLog("  --with, -w <module>              Add module (use multiple times)", "dim");
    addLog("", "output");
    addLog("SHELL COMMANDS:", "output");
    addLog("  clear, cls                       Clear screen", "dim");
    addLog("  ls, dir                          List files", "dim");
    addLog("  pwd                              Print working directory", "dim");
    addLog("  whoami                           Show current user", "dim");
    addLog("  date                             Show date/time", "dim");
    addLog("  echo <text>                      Print text", "dim");
    addLog("  exit, quit                       Close CLI", "dim");
    addLog("  help                             Show this help", "dim");
    addLog("", "output");
    addLog("EXAMPLES:", "output");
    addLog("  labz create counter my-counter", "success");
    addLog("  labz create prediction-market my-market", "success");
    addLog("  labz build counter my-project", "success");
    addLog("  labz build counter -w functions/encrypted-add", "success");
    addLog("  labz build token -w admin/ownable -w security/pausable", "success");
    addLog("", "output");
    addLog("TIP: Use Tab for autocomplete", "dim");
    addLog("", "output");
  };

  const runCommand = async () => {
    if (!input.trim() || isRunning) return;

    const cmd = input.trim();
    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    addLog(`user@labz:~$ ${cmd}`, "input");
    setInput("");

    const parsed = parseCommand(cmd);

    if (!parsed) {
      // Handle help commands
      if (cmd === "help" || cmd === "--help" || cmd === "-h" || cmd === "labz --help" || cmd === "labz -h") {
        showHelp();
        return;
      }
      if (cmd === "clear" || cmd === "cls") {
        setLogs([]);
        return;
      }
      if (cmd === "ls" || cmd === "dir") {
        addLog("", "output");
        addLog("contracts/  test/  scripts/  node_modules/", "dim");
        addLog("hardhat.config.ts  package.json  tsconfig.json  README.md", "dim");
        addLog("", "output");
        return;
      }
      if (cmd === "pwd") {
        addLog("/home/user/fhevm-project", "output");
        return;
      }
      if (cmd === "whoami") {
        addLog("user", "output");
        return;
      }
      if (cmd === "date") {
        addLog(new Date().toString(), "output");
        return;
      }
      if (cmd === "echo" || cmd.startsWith("echo ")) {
        addLog(cmd.replace("echo ", ""), "output");
        return;
      }
      if (cmd === "exit" || cmd === "quit") {
        onClose();
        return;
      }
      addLog(`bash: ${cmd.split(" ")[0]}: command not found`, "error");
      addLog("Try 'labz --help' for Lab-Z commands", "dim");
      return;
    }

    // Handle parse errors
    if (parsed.error) {
      addLog(`Syntax error: ${parsed.error}`, "error");
      addLog("Use 'labz --help' for usage information", "dim");
      return;
    }

    const { command, args } = parsed;

    // Handle help
    if (args.help) {
      showHelp();
      return;
    }

    // Handle list commands
    if (command === "create" && args.list) {
      setIsRunning(true);
      try {
        const res = await fetch("/api/cli/create");
        const data = await res.json();
        addLog("", "output");
        addLog("Available templates:", "success");
        for (const t of data.templates) {
          addLog(`  ${t}`, "dim");
        }
        addLog("", "output");
      } catch (e) {
        addLog(`Error: ${e}`, "error");
      }
      setIsRunning(false);
      return;
    }

    if (command === "build" && args.listBases) {
      setIsRunning(true);
      try {
        const res = await fetch("/api/cli/build");
        const data = await res.json();
        addLog("", "output");
        addLog("Available base templates:", "success");
        for (const b of data.bases) {
          addLog(`  ${b}`, "dim");
        }
        addLog("", "output");
      } catch (e) {
        addLog(`Error: ${e}`, "error");
      }
      setIsRunning(false);
      return;
    }

    if (command === "build" && args.listModules) {
      setIsRunning(true);
      try {
        const res = await fetch("/api/cli/build");
        const data = await res.json();
        addLog("", "output");
        addLog("Available modules:", "success");
        for (const m of data.modules) {
          addLog(`  ${m}`, "dim");
        }
        addLog("", "output");
      } catch (e) {
        addLog(`Error: ${e}`, "error");
      }
      setIsRunning(false);
      return;
    }

    // Handle create
    if (command === "create") {
      if (!args.template) {
        addLog("Error: Template name is required", "error");
        addLog("Usage: labz create <template> [project-name]", "dim");
        return;
      }

      setIsRunning(true);
      try {
        const res = await fetch("/api/cli/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template: args.template,
            projectName: args.projectName
          })
        });
        const data = await res.json();

        if (!res.ok) {
          addLog(`Error: ${data.error}`, "error");
          if (data.validTemplates) {
            addLog("Available templates:", "dim");
            data.validTemplates.slice(0, 10).forEach((t: string) => addLog(`  ${t}`, "dim"));
          }
        } else {
          addLog("", "output");
          for (const line of data.logs) {
            const type = line.startsWith("  +") ? "success" :
                        line.includes("successfully") || line.includes("complete") ? "success" : "output";
            addLog(line, type);
          }
          setZipData({ base64: data.zip, fileName: data.fileName });
        }
      } catch (e) {
        addLog(`Error: ${e}`, "error");
      }
      setIsRunning(false);
      return;
    }

    // Handle build
    if (command === "build") {
      if (!args.template) {
        addLog("Error: Base template name is required", "error");
        addLog("Usage: labz build <base> [project-name] [--with module]", "dim");
        return;
      }

      setIsRunning(true);
      try {
        const res = await fetch("/api/cli/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base: args.template,
            projectName: args.projectName,
            modules: args.with || []
          })
        });
        const data = await res.json();

        if (!res.ok) {
          addLog(`Error: ${data.error}`, "error");
          if (data.availableBases) {
            addLog("Available bases:", "dim");
            data.availableBases.forEach((b: string) => addLog(`  ${b}`, "dim"));
          }
          if (data.availableModules) {
            addLog("Available modules:", "dim");
            data.availableModules.slice(0, 10).forEach((m: string) => addLog(`  ${m}`, "dim"));
          }
        } else {
          addLog("", "output");
          for (const line of data.logs) {
            const type = line.startsWith("  +") || line.startsWith("  [OK]") ? "success" :
                        line.includes("complete") ? "success" : "output";
            addLog(line, type);
          }
          setZipData({ base64: data.zip, fileName: data.fileName });
        }
      } catch (e) {
        addLog(`Error: ${e}`, "error");
      }
      setIsRunning(false);
      return;
    }

    addLog(`Unknown command: ${command}`, "error");
    addLog("Available commands: create, build", "dim");
  };

  // Get autocomplete suggestions
  const getCompletions = (text: string): string[] => {
    const parts = text.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1] || "";

    // First word - command completion
    if (parts.length === 1) {
      return COMMANDS.filter(c => c.startsWith(lastPart) && c !== lastPart);
    }

    // labz subcommand
    if (parts[0] === "labz" && parts.length === 2) {
      return LABZ_COMMANDS.filter(c => c.startsWith(lastPart) && c !== lastPart);
    }

    // labz create <template>
    if (parts[0] === "labz" && parts[1] === "create" && parts.length === 3) {
      return templates.filter(t => t.startsWith(lastPart) && t !== lastPart);
    }

    // labz build <base>
    if (parts[0] === "labz" && parts[1] === "build" && parts.length === 3 && !lastPart.startsWith("-")) {
      return bases.filter(b => b.startsWith(lastPart) && b !== lastPart);
    }

    // --with module
    if (parts.includes("--with") || parts.includes("-w")) {
      const withIndex = parts.indexOf("--with") !== -1 ? parts.indexOf("--with") : parts.indexOf("-w");
      if (parts.length === withIndex + 2) {
        return modules.filter(m => m.startsWith(lastPart) && m !== lastPart);
      }
    }

    // build flags
    if (parts[0] === "labz" && parts[1] === "build" && lastPart.startsWith("-")) {
      return BUILD_FLAGS.filter(f => f.startsWith(lastPart) && f !== lastPart);
    }

    return [];
  };

  // Update suggestion on input change
  useEffect(() => {
    if (input) {
      const completions = getCompletions(input);
      if (completions.length > 0) {
        const parts = input.trim().split(/\s+/);
        const lastPart = parts[parts.length - 1] || "";
        setSuggestion(completions[0].slice(lastPart.length));
      } else {
        setSuggestion("");
      }
    } else {
      setSuggestion("");
    }
  }, [input, templates, bases, modules]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (suggestion) {
        setInput(input + suggestion);
        setSuggestion("");
      }
    } else if (e.key === "Enter") {
      setSuggestion("");
      runCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const handleDownload = () => {
    if (!zipData) return;
    const blob = new Blob([Uint8Array.from(atob(zipData.base64), c => c.charCodeAt(0))], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipData.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        backdropFilter: "blur(4px)"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="cli-terminal"
        style={{
          position: "relative",
          width: "90%",
          maxWidth: "900px",
          height: `${height}px`,
          minHeight: "300px",
          maxHeight: "90vh",
          background: "#000",
          border: "1px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          userSelect: isResizing ? "none" : "auto"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #333",
            background: "#1a1a1a"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f56", boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e", boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27c93f", boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }} />
            </div>
            <Terminal size={14} style={{ marginLeft: "12px", color: "var(--accent)" }} />
            <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#888" }}>
              Lab-Z CLI
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: "4px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Console Output */}
        <div
          ref={consoleRef}
          onClick={() => inputRef.current?.focus()}
          style={{
            flex: 1,
            padding: "16px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            lineHeight: 1.6,
            overflowY: "auto",
            minHeight: "200px",
            background: "#000",
            cursor: "text"
          }}
        >
          {/* Welcome message */}
          {logs.length === 0 && (
            <div style={{ color: "#888" }}>
              <div style={{ color: "#666", marginBottom: "12px" }}>Last login: {new Date().toLocaleString()}</div>
              <pre style={{ color: "var(--accent)", margin: 0, lineHeight: 1.2, fontSize: "11px" }}>{`
  ██╗      █████╗ ██████╗    ███████╗
  ██║     ██╔══██╗██╔══██╗   ╚══███╔╝
  ██║     ███████║██████╔╝     ███╔╝
  ██║     ██╔══██║██╔══██╗    ███╔╝
  ███████╗██║  ██║██████╔╝   ███████╗
  ╚══════╝╚═╝  ╚═╝╚═════╝    ╚══════╝
`}</pre>
              <div style={{ color: "#888", marginTop: "8px" }}>v1.0.0 - FHE Smart Contract Generator</div>
              <div style={{ marginTop: "12px", color: "#666" }}>
                Type <span style={{ color: "#fff" }}>labz --help</span> for commands • <span style={{ color: "#fff" }}>Tab</span> to autocomplete
              </div>
              <div style={{ marginTop: "16px" }} />
            </div>
          )}

          {logs.map((line, index) => (
            <div
              key={index}
              style={{
                color:
                  line.type === "input" ? "#00ff88" :
                  line.type === "success" ? "#00ff88" :
                  line.type === "error" ? "#ff5555" :
                  line.type === "dim" ? "#666" :
                  "#ccc",
                whiteSpace: "pre-wrap"
              }}
            >
              {line.text}
            </div>
          ))}

          {/* Input line - Ubuntu style prompt */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "8px",
              cursor: "text",
              background: "#000"
            }}
            onClick={() => inputRef.current?.focus()}
          >
            <span style={{ color: "#00ff88" }}>user@labz</span>
            <span style={{ color: "#fff" }}>:</span>
            <span style={{ color: "#5555ff" }}>~</span>
            <span style={{ color: "#fff", marginRight: "8px" }}>$</span>
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", background: "#000" }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
                className="cli-input"
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
              {/* Ghost suggestion text */}
              {suggestion && (
                <span
                  style={{
                    position: "absolute",
                    left: `${input.length * 7.8}px`,
                    color: "#444",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "13px",
                    pointerEvents: "none",
                    zIndex: 0,
                    background: "#000"
                  }}
                >
                  {suggestion}
                </span>
              )}
            </div>
            {isRunning && <Loader2 size={14} style={{ color: "#00ff88", animation: "spin 1s linear infinite" }} />}
          </div>
        </div>

        {/* Footer with Download */}
        {zipData && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #333",
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <span style={{ fontSize: "12px", color: "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>
              Ready to download: {zipData.fileName}
            </span>
            <button
              onClick={handleDownload}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "var(--accent)",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                fontSize: "13px",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Download size={14} />
              Download .zip
            </button>
          </div>
        )}

        {/* Resize Handle - Corner resize */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "20px",
            height: "20px",
            cursor: "nwse-resize",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: "4px"
          }}
          title="Drag to resize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#444">
            <path d="M9 1v8H1" stroke="#555" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .cli-terminal {
          background: #000 !important;
        }
        .cli-terminal * {
          background: transparent !important;
        }
        .cli-input {
          width: 100%;
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          border-width: 0 !important;
          outline: none !important;
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          caret-color: #00ff88;
          caret-shape: block;
          position: relative;
          z-index: 1;
          box-shadow: none !important;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          padding: 0 !important;
          margin: 0 !important;
        }
        .cli-input:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        .cli-input:focus-visible {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .cli-input::selection {
          background: #00ff88;
          color: #000;
        }
        .cli-input::-moz-focus-inner {
          border: 0;
        }
        .cli-input::placeholder {
          color: #333;
        }
      `}</style>
    </div>
  );
}
