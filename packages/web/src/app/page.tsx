"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Terminal, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { CategoryTabs } from "@/components/category-tabs";
import { TemplateGrid } from "@/components/template-grid";
import { TemplateDetail } from "@/components/template-detail";
import { InteractiveCLI } from "@/components/interactive-cli";
import { templates as mockTemplates } from "@/lib/mock-data";
import type { Template, Category } from "@/lib/types";

const ITEMS_PER_PAGE = 12;
const PINNED_STORAGE_KEY = "labz-pinned-templates";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [loading, setLoading] = useState(true);
  const [cliOpen, setCliOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [showMoreExamples, setShowMoreExamples] = useState(false);

  // Load pinned templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PINNED_STORAGE_KEY);
      if (stored) {
        setPinnedIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.warn("Failed to load pinned templates:", e);
    }
  }, []);

  // Save pinned templates to localStorage
  const savePinnedIds = useCallback((ids: Set<string>) => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify([...ids]));
    } catch (e) {
      console.warn("Failed to save pinned templates:", e);
    }
  }, []);

  // Toggle pin for a template
  const togglePin = useCallback((templateId: string) => {
    setPinnedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      savePinnedIds(newSet);
      return newSet;
    });
  }, [savePinnedIds]);

  // Load templates from API
  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await fetch('/api/templates');
        const data = await response.json();
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
        }
      } catch (error) {
        console.warn('Failed to load templates from API, using mock data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Search filter - search in id, name, description, and tags
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          t.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [templates, selectedCategory, searchQuery]);

  // Separate pinned and unpinned templates, avoiding duplicates
  const { pinnedTemplates, unpinnedTemplates } = useMemo(() => {
    const pinnedSet = new Set<string>();
    const pinned: Template[] = [];
    const unpinned: Template[] = [];

    // First, collect pinned templates that match the filter
    for (const template of filteredTemplates) {
      if (pinnedIds.has(template.id)) {
        pinnedSet.add(template.id);
        pinned.push(template);
      }
    }

    // Then collect unpinned templates (excluding already pinned ones)
    for (const template of filteredTemplates) {
      if (!pinnedSet.has(template.id)) {
        unpinned.push(template);
      }
    }

    return { pinnedTemplates: pinned, unpinnedTemplates: unpinned };
  }, [filteredTemplates, pinnedIds]);

  // Combine pinned + unpinned for display (pinned first)
  const allDisplayTemplates = useMemo(() => {
    return [...pinnedTemplates, ...unpinnedTemplates];
  }, [pinnedTemplates, unpinnedTemplates]);

  // Pagination
  const totalPages = Math.ceil(allDisplayTemplates.length / ITEMS_PER_PAGE);
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allDisplayTemplates.slice(start, start + ITEMS_PER_PAGE);
  }, [allDisplayTemplates, currentPage]);

  // Count how many pinned are on current page
  const pinnedOnCurrentPage = useMemo(() => {
    return paginatedTemplates.filter(t => pinnedIds.has(t.id)).length;
  }, [paginatedTemplates, pinnedIds]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Hero Section */}
      <section style={{
        borderBottom: '1px solid var(--border)',
        padding: '64px 16px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 600,
            marginBottom: '16px',
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <img src="/logo.svg" alt="Lab-Z" width={36} height={36} />
            Lab-Z
          </h1>
          <p style={{
            color: 'var(--fg-muted)',
            fontSize: '15px',
            maxWidth: '600px',
            margin: '0 auto 32px',
            lineHeight: 1.6
          }}>
            composable fhe smart contract templates. production-ready examples with
            full test suites, documentation, and hardhat integration.
          </p>

          {/* CLI Command Showcase */}
          <div className="code-block" style={{
            maxWidth: '560px',
            margin: '0 auto',
            textAlign: 'left'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>// no installation required</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ color: 'var(--success)' }}>$</span>
              <code style={{ color: 'var(--accent)', fontWeight: 500 }}>npx create-labz</code>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>// or specify template directly</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--success)' }}>$</span>
              <code>npx create-labz counter my-project</code>
            </div>

            {/* More Examples - Collapsible */}
            {showMoreExamples && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>// quick start with standalone templates</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--success)' }}>$</span>
                  <code>labz create prediction-market my-market</code>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>// or compose custom contracts with modules</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--success)' }}>$</span>
                  <code>labz build auction my-auction --with acl/auction-sharing</code>
                </div>
              </div>
            )}

            {/* View More Toggle */}
            <button
              onClick={() => setShowMoreExamples(!showMoreExamples)}
              style={{
                marginTop: '12px',
                padding: '4px 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-muted)',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {showMoreExamples ? '- hide examples' : '+ view more examples'}
            </button>
          </div>

          {/* CLI Launcher Button */}
          <button
            onClick={() => setCliOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '24px',
              padding: '12px 24px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--fg)',
              fontSize: '14px',
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-secondary)';
            }}
          >
            <Terminal size={16} />
            Try CLI
          </button>
        </div>
      </section>

      {/* Interactive CLI Modal */}
      <InteractiveCLI
        isOpen={cliOpen}
        onClose={() => setCliOpen(false)}
      />

      {/* Main Content */}
      <main id="templates" style={{ flex: 1, maxWidth: '1600px', margin: '0 auto', padding: '48px 16px', width: '100%' }}>

        {/* Search */}
        <section style={{ marginBottom: '32px' }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="search templates... (counter, acl, encryption, euint32)"
          />
        </section>

        {/* Category Tabs */}
        <section style={{ marginBottom: '32px' }}>
          <CategoryTabs
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </section>

        {/* Results Count & Pagination Info */}
        <section style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '16px'
        }}>
          <p style={{
            color: 'var(--fg-muted)',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {allDisplayTemplates.length} result{allDisplayTemplates.length !== 1 ? "s" : ""}
            {pinnedIds.size > 0 && ` • ${pinnedIds.size} pinned`}
            {totalPages > 1 && ` • page ${currentPage}/${totalPages}`}
          </p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--fg-muted)' }}>
            <span>sort: pinned first, then difficulty</span>
          </div>
        </section>

        {/* Template Grid or Detail View */}
        {selectedTemplate ? (
          <TemplateDetail
            template={selectedTemplate}
            onBack={() => setSelectedTemplate(null)}
          />
        ) : (
          <>
            <TemplateGrid
              templates={paginatedTemplates}
              onSelect={setSelectedTemplate}
              pinnedIds={pinnedIds}
              onTogglePin={togglePin}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                marginTop: '32px',
                padding: '16px 0'
              }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 16px',
                    background: currentPage === 1 ? 'var(--bg)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: currentPage === 1 ? 'var(--fg-muted)' : 'var(--fg)',
                    fontSize: '12px',
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={14} />
                  prev
                </button>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: page === currentPage ? 'var(--accent)' : 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        color: page === currentPage ? '#000' : 'var(--fg)',
                        fontSize: '12px',
                        fontFamily: "'JetBrains Mono', monospace",
                        cursor: 'pointer',
                        fontWeight: page === currentPage ? 600 : 400
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 16px',
                    background: currentPage === totalPages ? 'var(--bg)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: currentPage === totalPages ? 'var(--fg-muted)' : 'var(--fg)',
                    fontSize: '12px',
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  next
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Features Section */}
      <section style={{
        borderTop: '1px solid var(--border)',
        padding: '64px 16px',
        marginTop: '48px',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '32px',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            features
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            {[
              {
                title: 'cli tool',
                desc: 'generate projects from terminal. npx create-labz'
              },
              {
                title: 'web interface',
                desc: 'browse, search, and preview templates before downloading'
              },
              {
                title: 'hardhat ready',
                desc: 'all templates include hardhat config, tests, and deployment scripts'
              },
              {
                title: 'full test suites',
                desc: 'every template comes with comprehensive test coverage'
              },
              {
                title: 'categorized',
                desc: 'organized by difficulty and use case for easy navigation'
              },
              {
                title: 'documented',
                desc: 'inline comments and block explanations for learning'
              },
            ].map((feature) => (
              <div key={feature.title} className="card" style={{ background: 'var(--bg-secondary)' }}>
                <h3 style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--fg-muted)',
                  lineHeight: 1.5
                }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Paths */}
      <section style={{
        borderTop: '1px solid var(--border)',
        padding: '64px 16px'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '32px',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            learning paths
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              {
                level: 'beginner',
                steps: ['counter', 'add', 'compare', 'select'],
                color: 'var(--success)'
              },
              {
                level: 'intermediate',
                steps: ['acl-allow', 'allowTransient', 'input-proofs', 'decrypt'],
                color: 'var(--warning)'
              },
              {
                level: 'advanced',
                steps: ['erc20-encrypted', 'blind-auction', 'private-voting', 'bridge'],
                color: 'var(--error)'
              }
            ].map((path) => (
              <div key={path.level} className="card">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    background: path.color,
                    display: 'inline-block'
                  }} />
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {path.level}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {path.steps.map((step, i) => (
                    <div key={step} className="tree-item">
                      <span style={{ color: 'var(--fg-muted)', marginRight: '8px' }}>{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)'
      }}>
        {/* Main Footer */}
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '48px 16px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '48px'
        }}>
          {/* About */}
          <div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '16px',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              Lab-Z
            </h3>
            <p style={{
              fontSize: '12px',
              color: 'var(--fg-muted)',
              lineHeight: 1.6,
              marginBottom: '16px'
            }}>
              open source toolkit for building with fully homomorphic encryption.
              generate, learn, and ship fhe smart contracts faster.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="https://github.com/Farukest" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)', fontSize: '12px' }}>
                github
              </a>
              <a href="https://x.com/0xflydev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)', fontSize: '12px' }}>
                twitter
              </a>
              <a href="https://stackoverflow.com/users/3583237/farukest" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)', fontSize: '12px' }}>
                stackoverflow
              </a>
            </div>
          </div>

          {/* Templates */}
          <div>
            <h4 style={{
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
              color: 'var(--fg-muted)',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              templates
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['basics', 'encryption', 'acl', 'advanced'].map((cat) => (
                <a key={cat} href={`#${cat}`} style={{
                  fontSize: '12px',
                  color: 'var(--fg)',
                  textDecoration: 'none'
                }}>
                  {cat}
                </a>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 style={{
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
              color: 'var(--fg-muted)',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              resources
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="https://docs.fhevm.io" target="_blank" rel="noopener noreferrer" style={{
                fontSize: '12px',
                color: 'var(--fg)',
                textDecoration: 'none'
              }}>
                fhevm docs
              </a>
              <a href="#" style={{ fontSize: '12px', color: 'var(--fg)', textDecoration: 'none' }}>
                cli reference
              </a>
              <a href="#" style={{ fontSize: '12px', color: 'var(--fg)', textDecoration: 'none' }}>
                examples
              </a>
            </div>
          </div>

          {/* CLI */}
          <div>
            <h4 style={{
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
              color: 'var(--fg-muted)',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              quick start
            </h4>
            <div className="code-block" style={{ padding: '12px', fontSize: '11px' }}>
              <div>npx create-labz</div>
              <div style={{ color: 'var(--fg-muted)', marginTop: '8px' }}>npx create-labz counter my-project</div>
              <div style={{ color: 'var(--fg-muted)' }}>npx create-labz auction my-auction</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1600px',
          margin: '0 auto'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            {new Date().getFullYear()} // Built for{' '}
            <a href="https://www.zama.ai/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Zama
            </a>{' '}
            Bounty
          </span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href="https://docs.zama.ai/fhevm" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none' }}>
              fhEVM Docs
            </a>
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              v1.0.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
