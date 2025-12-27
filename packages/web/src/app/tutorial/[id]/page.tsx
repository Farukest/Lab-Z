"use client";

import { useState, useEffect, use } from "react";
import { Header } from "@/components/header";
import { InteractiveTutorial } from "@/components/interactive-tutorial";
import { getTutorialByTemplateId, Tutorial } from "@/tutorials";
import { ArrowLeft, BookOpen, Copy, Download, Check, Terminal } from "lucide-react";
import Link from "next/link";

interface TemplateData {
  id: string;
  name: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  tags: string[];
  category: string;
  contractCode: string;
  testCode: string;
  sections?: { id: string; title: string; description: string }[];
}

const DIFFICULTY_COLORS = {
  beginner: "var(--success)",
  intermediate: "var(--warning)",
  advanced: "var(--error)",
};

async function getTemplateData(id: string): Promise<TemplateData | null> {
  try {
    const response = await fetch(`/api/templates/${id}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default function TutorialPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const templateId = resolvedParams.id;

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    async function loadData() {
      // Try to get template data from API
      const data = await getTemplateData(templateId);
      if (data) {
        setTemplateData(data);
      }

      // Try to get tutorial data
      const tutorialData = getTutorialByTemplateId(templateId);
      if (tutorialData) {
        setTutorial(tutorialData);
      }

      setLoading(false);
    }

    loadData();
  }, [templateId]);

  const handleCopyContract = async () => {
    if (!templateData?.contractCode) return;
    await navigator.clipboard.writeText(templateData.contractCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText(`npx labz create ${templateId} my-${templateId}-app`);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch("/api/cli/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateId })
      });

      if (!response.ok) {
        console.error("Download failed");
        return;
      }

      const data = await response.json();
      if (data.zip) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.zip), c => c.charCodeAt(0))],
          { type: "application/zip" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.fileName || `${templateId}-project.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          Loading...
        </div>
      </div>
    );
  }

  // If no template data found, show error
  if (!templateData && !tutorial) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>
            Template not found: {templateId}
          </div>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            back to templates
          </Link>
        </div>
      </div>
    );
  }

  // Use template data or fallback to tutorial info
  const name = templateData?.name || tutorial?.title || templateId;
  const difficulty = templateData?.difficulty || "beginner";
  const description = templateData?.description || tutorial?.description || "";
  const tags = templateData?.tags || [];
  const category = templateData?.category || "";
  const contractCode = templateData?.contractCode || "";
  const testCode = templateData?.testCode || "";
  const sections = templateData?.sections || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Template Header */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '9px 16px' }}>
          {/* Back link */}
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--fg-muted)',
              textDecoration: 'none',
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: '16px',
            }}
          >
            <ArrowLeft style={{ width: '14px', height: '14px' }} />
            back
          </Link>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <BookOpen style={{ width: '24px', height: '24px', color: 'var(--accent)' }} />
            <h1 style={{
              fontSize: '24px',
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              margin: 0,
            }}>
              {name}
            </h1>
            <span style={{
              padding: '4px 10px',
              background: DIFFICULTY_COLORS[difficulty],
              color: '#000',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase',
            }}>
              {difficulty}
            </span>
          </div>

          {/* Category */}
          {category && (
            <div style={{
              fontSize: '11px',
              color: 'var(--fg-muted)',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: '8px',
            }}>
              {category}/
            </div>
          )}

          {/* Description */}
          <p style={{
            color: 'var(--fg-muted)',
            fontSize: '14px',
            marginBottom: '16px',
            maxWidth: '600px',
          }}>
            {description}
          </p>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--fg-muted)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Sections (if available) */}
          {sections.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '2px',
              background: 'var(--border)',
              padding: '1px',
              marginBottom: '16px',
            }}>
              {sections.map((section, idx) => (
                <div
                  key={section.id}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'var(--bg)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--fg-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginBottom: '4px',
                  }}>
                    {idx + 1}. {section.title}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--fg)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {section.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CLI Command */}
          <div
            className="code-block"
            style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--success)' }}>$</span>
              <code style={{ color: 'var(--fg)' }}>npx labz create {templateId} my-{templateId}-app</code>
            </div>
            <button
              onClick={handleCopyCommand}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--fg-muted)',
              }}
              title="Copy command"
            >
              {copiedCmd ? (
                <Check style={{ width: '14px', height: '14px', color: 'var(--success)' }} />
              ) : (
                <Copy style={{ width: '14px', height: '14px' }} />
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {contractCode && (
              <button onClick={handleCopyContract} className="btn" style={{ padding: '6px 12px' }}>
                {copied ? (
                  <Check style={{ width: '12px', height: '12px', color: 'var(--success)' }} />
                ) : (
                  <Copy style={{ width: '12px', height: '12px' }} />
                )}
                <span style={{ fontSize: '11px' }}>{copied ? "copied" : "copy contract"}</span>
              </button>
            )}
            <button onClick={handleDownload} className="btn btn-primary" style={{ padding: '6px 12px' }}>
              <Download style={{ width: '12px', height: '12px' }} />
              <span style={{ fontSize: '11px' }}>download .zip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial or Code View */}
      <main style={{ flex: 1, maxWidth: '1600px', margin: '0 auto', padding: '9px 16px', width: '100%', marginBottom: '200px' }}>
        {tutorial ? (
          <InteractiveTutorial
            testCode={testCode}
            contractCode={contractCode}
            tutorial={tutorial}
            templateName={name}
          />
        ) : (
          // If no tutorial, show code panels
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            {/* Contract Code */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Terminal size={16} style={{ color: 'var(--accent)' }} />
                Contract
              </h3>
              <pre style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '16px',
                overflow: 'auto',
                maxHeight: '600px',
                fontSize: '12px',
                lineHeight: 1.6,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <code>{contractCode || "// Contract code not available"}</code>
              </pre>
            </div>

            {/* Test Code */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Terminal size={16} style={{ color: 'var(--success)' }} />
                Test
              </h3>
              <pre style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '16px',
                overflow: 'auto',
                maxHeight: '600px',
                fontSize: '12px',
                lineHeight: 1.6,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <code>{testCode || "// Test code not available"}</code>
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: '60px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        padding: '24px 16px 40px',
      }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date().getFullYear()} // Built for{' '}
              <a href="https://www.zama.ai/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Zama
              </a>{' '}
              Bounty
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href="https://x.com/0xflydev" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}>
              @0xflydev
            </a>
            <a href="https://github.com/Farukest" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}>
              GitHub
            </a>
            <a href="https://docs.zama.ai/fhevm" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}>
              fhEVM Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
