"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Terminal, Pin } from "lucide-react";
import type { Template, Difficulty } from "@/lib/types";
import { CLIConsole } from "./cli-console";
import { InteractiveCLI } from "./interactive-cli";

interface TemplateGridProps {
  templates: Template[];
  onSelect?: (template: Template) => void;
  pinnedIds?: Set<string>;
  onTogglePin?: (templateId: string) => void;
}

const difficultyClass: Record<Difficulty, string> = {
  beginner: "diff-beginner",
  intermediate: "diff-intermediate",
  advanced: "diff-advanced",
};

// All templates now have dynamic tutorial pages at /tutorial/[id]
// This function generates the URL for any template
function getTutorialUrl(templateId: string): string {
  return `/tutorial/${templateId}`;
}

// Card content component to avoid duplication
function TemplateCardContent({
  template,
  isPinned,
  onPlayClick,
  onTerminalClick,
  onPinClick
}: {
  template: Template;
  isPinned?: boolean;
  onPlayClick?: (e: React.MouseEvent) => void;
  onTerminalClick?: (e: React.MouseEvent) => void;
  onPinClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isPinned && (
              <Pin size={12} style={{ color: 'var(--accent)', transform: 'rotate(45deg)' }} />
            )}
            <code style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
              {template.name}
            </code>
          </div>
          <span className={difficultyClass[template.difficulty]} style={{ fontSize: '12px' }}>
            {template.difficulty}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--fg-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          {template.category}/
        </span>
      </div>

      {/* Description */}
      <p style={{ color: 'var(--fg-muted)', fontSize: '12px', marginBottom: '12px', lineHeight: 1.5, flex: 1 }}>
        {template.description}
      </p>

      {/* Bottom Row: Tags + Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)' }}>
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* Action Buttons - Bottom Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
          {onPlayClick && (
            <button
              onClick={onPlayClick}
              title="Quick Download"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#000',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Play size={12} fill="currentColor" />
            </button>
          )}
          {onTerminalClick && (
            <button
              onClick={onTerminalClick}
              title="Open in CLI"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--fg)',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <Terminal size={12} />
            </button>
          )}
          {onPinClick && (
            <button
              onClick={onPinClick}
              title={isPinned ? "Unpin" : "Pin to top"}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                background: isPinned ? 'var(--accent)' : 'var(--bg-secondary)',
                border: `1px solid ${isPinned ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                color: isPinned ? '#000' : 'var(--fg-muted)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isPinned) {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--accent)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isPinned) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--fg-muted)';
                }
              }}
            >
              <Pin size={12} style={{ transform: isPinned ? 'rotate(45deg)' : 'none' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TemplateGrid({ templates, onSelect, pinnedIds, onTogglePin }: TemplateGridProps) {
  const [cliTemplate, setCliTemplate] = useState<Template | null>(null);
  const [interactiveTemplate, setInteractiveTemplate] = useState<Template | null>(null);

  if (templates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <p style={{ color: 'var(--fg-muted)', fontSize: '14px' }}>no templates found.</p>
        <p style={{ color: 'var(--fg-muted)', fontSize: '12px', marginTop: '8px' }}>try adjusting your search or filters.</p>
      </div>
    );
  }

  const cardStyle = {
    textAlign: 'left' as const,
    cursor: 'pointer',
    display: 'block',
    width: '100%',
  };

  const handlePlayClick = (e: React.MouseEvent, template: Template) => {
    e.preventDefault();
    e.stopPropagation();
    setCliTemplate(template);
  };

  const handleTerminalClick = (e: React.MouseEvent, template: Template) => {
    e.preventDefault();
    e.stopPropagation();
    setInteractiveTemplate(template);
  };

  const handlePinClick = (e: React.MouseEvent, template: Template) => {
    e.preventDefault();
    e.stopPropagation();
    onTogglePin?.(template.id);
  };

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {templates.map((template) => {
          const tutorialUrl = getTutorialUrl(template.id);
          const isPinned = pinnedIds?.has(template.id) ?? false;

          // Card wrapper style with pinned indicator
          const cardWrapperStyle = {
            ...cardStyle,
            position: 'relative' as const,
            border: isPinned ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: isPinned ? 'rgba(255, 204, 0, 0.03)' : 'var(--bg)',
          };

          // All templates link to their tutorial page
          return (
            <Link
              key={template.id}
              href={tutorialUrl}
              className="card"
              style={{
                ...cardWrapperStyle,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <TemplateCardContent
                template={template}
                isPinned={isPinned}
                onPlayClick={(e) => handlePlayClick(e, template)}
                onTerminalClick={(e) => handleTerminalClick(e, template)}
                onPinClick={onTogglePin ? (e) => handlePinClick(e, template) : undefined}
              />
            </Link>
          );
        })}
      </div>

      {/* CLI Console Modal (Simulation) */}
      <CLIConsole
        isOpen={cliTemplate !== null}
        onClose={() => setCliTemplate(null)}
        templateId={cliTemplate?.id || ""}
        templateName={cliTemplate?.name || ""}
      />

      {/* Interactive CLI Modal (Real) */}
      <InteractiveCLI
        isOpen={interactiveTemplate !== null}
        onClose={() => setInteractiveTemplate(null)}
        initialCommand={interactiveTemplate ? `labz create ${interactiveTemplate.id}` : ""}
      />
    </>
  );
}
