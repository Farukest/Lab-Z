"use client";

import React, { useState, useMemo } from "react";
import { ArrowLeft, Copy, Download, Check, Zap } from "lucide-react";
import { CodeEditor } from "./code-editor";
import { InteractiveTutorial } from "./interactive-tutorial";
import { generateTutorialSteps, DEFAULT_STEPS } from "@/lib/tutorial-generator";
import { getTutorialByTemplateId } from "@/tutorials";
import type { Template, Difficulty } from "@/lib/types";

interface TemplateDetailProps {
  template: Template;
  onBack: () => void;
}

const difficultyClass: Record<Difficulty, string> = {
  beginner: "diff-beginner",
  intermediate: "diff-intermediate",
  advanced: "diff-advanced",
};

type Tab = "tutorial" | "contract" | "test" | "explanation";

export function TemplateDetail({ template, onBack }: TemplateDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("tutorial");
  const [copied, setCopied] = useState(false);

  // Get tutorial from tutorials folder (new system)
  const tutorial = useMemo(() => {
    return getTutorialByTemplateId(template.id);
  }, [template.id]);

  // Generate legacy tutorial steps from template blocks (fallback)
  const legacyTutorialSteps = useMemo(() => {
    // If we have a new-style tutorial, don't need legacy steps
    if (tutorial) return [];

    // Check for pre-defined steps
    if (DEFAULT_STEPS[template.id]) {
      return DEFAULT_STEPS[template.id];
    }
    // Generate from blocks
    return generateTutorialSteps(
      template.blocks,
      template.contractCode,
      template.testCode,
      (template as any).fheOperations
    );
  }, [template, tutorial]);

  const handleCopy = async () => {
    const code = activeTab === "contract" ? template.contractCode : template.testCode;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    // Download full project as ZIP from API
    const response = await fetch(`/api/download/${template.id}`);
    if (!response.ok) {
      console.error('Download failed');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.id}-project.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Tab; label: string; icon?: React.ReactNode }[] = [
    { id: "tutorial", label: "interactive", icon: <Zap style={{ width: '12px', height: '12px' }} /> },
    { id: "contract", label: "contract.sol" },
    { id: "test", label: "test.ts" },
    { id: "explanation", label: "readme" },
  ];

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--fg-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '24px',
          fontSize: '13px',
          fontFamily: "'JetBrains Mono', monospace"
        }}
      >
        <ArrowLeft style={{ width: '14px', height: '14px' }} />
        <span>../</span>
      </button>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>{template.name}</h1>
          <span className={difficultyClass[template.difficulty]} style={{ fontSize: '12px' }}>
            {template.difficulty}
          </span>
        </div>
        <p style={{ color: 'var(--fg-muted)', fontSize: '13px' }}>{template.description}</p>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '24px' }}>
        {template.tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      {/* CLI Command */}
      <div className="code-block" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--success)' }}>$</span>
          <code style={{ color: 'var(--fg)' }}>npx labz create {template.id} my-{template.id}-app</code>
        </div>
      </div>

      {/* Tabs and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
        <div className="tabs" style={{ borderBottom: 'none' }}>
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={activeTab === id ? "tab active" : "tab"}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={handleCopy} className="btn" style={{ padding: '4px 8px' }}>
            {copied ? <Check style={{ width: '12px', height: '12px', color: 'var(--success)' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
            <span style={{ fontSize: '11px' }}>{copied ? "copied" : "copy"}</span>
          </button>
          <button onClick={handleDownload} className="btn btn-primary" style={{ padding: '4px 8px' }}>
            <Download style={{ width: '12px', height: '12px' }} />
            <span style={{ fontSize: '11px' }}>download .zip</span>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ border: activeTab === 'tutorial' ? 'none' : '1px solid var(--border)', background: activeTab === 'tutorial' ? 'transparent' : 'var(--bg-secondary)' }}>
        {activeTab === "tutorial" && (tutorial || legacyTutorialSteps.length > 0) && (
          <InteractiveTutorial
            testCode={template.testCode}
            contractCode={template.contractCode}
            tutorial={tutorial || undefined}
            steps={legacyTutorialSteps.length > 0 ? legacyTutorialSteps : undefined}
            templateName={template.name}
          />
        )}
        {activeTab === "tutorial" && !tutorial && legacyTutorialSteps.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <p style={{ color: 'var(--fg-muted)', fontSize: '14px' }}>
              Interactive tutorial not available for this template yet.
            </p>
            <p style={{ color: 'var(--fg-muted)', fontSize: '12px', marginTop: '8px' }}>
              Check the contract.sol and test.ts tabs for the source code.
            </p>
          </div>
        )}
        {activeTab === "contract" && (
          <CodeEditor
            code={template.contractCode}
            language="solidity"
            blocks={template.blocks}
          />
        )}
        {activeTab === "test" && (
          <CodeEditor
            code={template.testCode}
            language="typescript"
          />
        )}
        {activeTab === "explanation" && (
          <div style={{ padding: '16px' }}>
            {template.blocks.map((block) => (
              <div key={block.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="tag">{block.type}</span>
                  <span style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                    L{block.lines[0]}-{block.lines[1]}
                  </span>
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.6 }}>{block.explanation}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                  {block.searchTerms.map((term) => (
                    <span key={term} style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
                      #{term}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related & Next Steps */}
      {(template.relatedTemplates?.length || template.nextSteps?.length) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
          {template.relatedTemplates && template.relatedTemplates.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: 'var(--fg-muted)' }}>related/</h3>
              {template.relatedTemplates.map((id) => (
                <div key={id} className="tree-item" style={{ paddingLeft: '12px' }}>
                  {id}
                </div>
              ))}
            </div>
          )}
          {template.nextSteps && template.nextSteps.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', color: 'var(--fg-muted)' }}>next/</h3>
              {template.nextSteps.map((id) => (
                <div key={id} className="tree-item" style={{ paddingLeft: '12px' }}>
                  {id}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
