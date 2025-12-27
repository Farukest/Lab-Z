"use client";

import React, { useState, useCallback, useMemo } from "react";
import { GLOSSARY, getTerm, CATEGORY_COLORS, type GlossaryTerm } from "@/lib/glossary";

// ============ Types ============

interface ParsedSegment {
  type: 'text' | 'method' | 'fheCall' | 'value' | 'variable' | 'term' | 'address' | 'paramRef' | 'txHash' | 'msgSender' | 'thisRef';
  content: string;
  // For methods: the method name without parentheses
  methodName?: string;
  // For terms: the glossary key
  termKey?: string;
}

interface SmartTextProps {
  /** The text to parse and enrich */
  text: string;
  /** Callback when a method is clicked (for highlight + arrow) */
  onMethodClick?: (methodName: string, element: HTMLElement) => void;
  /** Callback when an FHE call is clicked */
  onFheClick?: (fheMethod: string, element: HTMLElement) => void;
  /** Callback when a value is clicked (for arrow animation) */
  onValueClick?: (value: string, element: HTMLElement) => void;
  /** Callback when a variable is clicked */
  onVariableClick?: (variable: string, element: HTMLElement) => void;
  /** Callback when 'this' or 'address(this)' is clicked (highlight contract) */
  onThisClick?: (element: HTMLElement) => void;
  /** Custom class name */
  className?: string;
  /** Disable tooltips (for nested SmartText in tooltips) */
  disableTooltips?: boolean;
}

// ============ Pattern Definitions ============

// Order matters! More specific patterns first
const PATTERNS = [
  // Transaction hash: tx1 → 0x..., tx2 → 0x..., etc.
  {
    type: 'txHash' as const,
    regex: /tx\d*\s*→\s*0x[a-fA-F0-9]{8,}/g,
  },
  // Ethereum addresses: 0x followed by 40 hex chars (full) or 8+ (shortened)
  {
    type: 'address' as const,
    regex: /0x[a-fA-F0-9]{8,40}(?:\.{2,3})?/g,
  },
  // Solidity msg.sender
  {
    type: 'msgSender' as const,
    regex: /\bmsg\.sender\b/g,
  },
  // Solidity address(this) or this (contract self-reference)
  {
    type: 'thisRef' as const,
    regex: /\baddress\(this\)|\bthis\b/g,
  },
  // Parameter references: identifier.address, identifier.value, etc.
  {
    type: 'paramRef' as const,
    regex: /\b[a-z]\w*\.(address|value|balance|amount|sender)\b/g,
  },
  // FHE method calls: FHE.xxx or FHE.xxx()
  {
    type: 'fheCall' as const,
    regex: /\bFHE\.\w+(?:\(\))?/g,
  },
  // Contract method calls: contract.methodName() or ClassName.methodName()
  {
    type: 'method' as const,
    regex: /\b(?:contract|[A-Z]\w+)\.\w+(?:\s*\([^)]*\))?/g,
  },
  // Standalone function calls that look like methods: methodName()
  {
    type: 'method' as const,
    regex: /\b[a-z]\w+\s*\([^)]*\)/g,
  },
  // Numeric values: 42, 100n, 0x... (but not addresses - handled above)
  {
    type: 'value' as const,
    regex: /\b(?:\d+n?)\b/g,
  },
  // Variable names: camelCase identifiers like secretValue, handle, etc.
  // Must start with lowercase, have at least one uppercase letter (camelCase)
  {
    type: 'variable' as const,
    regex: /\b[a-z]+[A-Z][a-zA-Z0-9]*\b/g,
  },
];

// Build glossary term pattern dynamically
function buildTermPattern(): RegExp {
  const terms = Object.keys(GLOSSARY)
    .filter(term => !term.startsWith('FHE.')) // FHE methods handled separately
    .sort((a, b) => b.length - a.length) // Longer terms first
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex chars

  return new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
}

// ============ Parser ============

function parseText(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let remaining = text;
  let lastIndex = 0;

  // Collect all matches with their positions
  interface Match {
    type: ParsedSegment['type'];
    content: string;
    start: number;
    end: number;
    methodName?: string;
    termKey?: string;
  }

  const allMatches: Match[] = [];

  // Find pattern matches
  for (const pattern of PATTERNS) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      const content = match[0];
      allMatches.push({
        type: pattern.type,
        content,
        start: match.index,
        end: match.index + content.length,
        methodName: pattern.type === 'method' || pattern.type === 'fheCall'
          ? content.replace(/\s*\([^)]*\)$/, '').split('.').pop()
          : undefined,
      });
    }
  }

  // Find glossary term matches
  const termPattern = buildTermPattern();
  let termMatch: RegExpExecArray | null;
  while ((termMatch = termPattern.exec(text)) !== null) {
    const content = termMatch[0];
    const matchIndex = termMatch.index;
    const termKey = Object.keys(GLOSSARY).find(
      k => k.toLowerCase() === content.toLowerCase()
    );

    // Check if this position is already covered by another match
    const isCovered = allMatches.some(
      m => matchIndex >= m.start && matchIndex < m.end
    );

    if (!isCovered && termKey) {
      allMatches.push({
        type: 'term',
        content,
        start: matchIndex,
        end: matchIndex + content.length,
        termKey,
      });
    }
  }

  // Sort by start position
  allMatches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep first)
  const nonOverlapping: Match[] = [];
  let lastEnd = 0;
  for (const match of allMatches) {
    if (match.start >= lastEnd) {
      nonOverlapping.push(match);
      lastEnd = match.end;
    }
  }

  // Build segments
  let currentIndex = 0;
  for (const match of nonOverlapping) {
    // Add text before this match
    if (match.start > currentIndex) {
      segments.push({
        type: 'text',
        content: text.slice(currentIndex, match.start),
      });
    }

    // Add the match
    segments.push({
      type: match.type,
      content: match.content,
      methodName: match.methodName,
      termKey: match.termKey,
    });

    currentIndex = match.end;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(currentIndex),
    });
  }

  return segments;
}

// ============ Simple SmartText for Tooltips (no nested tooltips) ============

interface TooltipSmartTextProps {
  text: string;
  onMethodClick?: (methodName: string, element: HTMLElement) => void;
  onFheClick?: (fheMethod: string, element: HTMLElement) => void;
  onValueClick?: (value: string, element: HTMLElement) => void;
  onVariableClick?: (variable: string, element: HTMLElement) => void;
}

function TooltipSmartText({ text, onMethodClick, onFheClick, onValueClick, onVariableClick }: TooltipSmartTextProps) {
  const segments = useMemo(() => parseText(text), [text]);

  return (
    <span>
      {segments.map((segment, index) => {
        const key = `${segment.type}-${index}`;

        switch (segment.type) {
          case 'text':
            return <span key={key}>{segment.content}</span>;

          case 'method':
            return (
              <span
                key={key}
                onClick={(e) => {
                  if (onMethodClick && segment.methodName) {
                    onMethodClick(segment.methodName, e.currentTarget);
                  }
                }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#ec4899',
                  padding: '1px 3px',
                  cursor: 'pointer',
                  borderBottom: '1px dashed #ec4899',
                  fontSize: '10px',
                }}
              >
                {segment.content}
              </span>
            );

          case 'fheCall':
            return (
              <span
                key={key}
                onClick={(e) => {
                  if (onFheClick) {
                    onFheClick(segment.content.replace(/\(\)$/, ''), e.currentTarget);
                  }
                }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'rgba(139, 92, 246, 0.25)',
                  color: '#a78bfa',
                  padding: '1px 3px',
                  cursor: 'pointer',
                  borderBottom: '1px dashed #8b5cf6',
                  fontSize: '10px',
                }}
              >
                {segment.content}
              </span>
            );

          case 'variable':
            return (
              <span
                key={key}
                onClick={(e) => {
                  if (onVariableClick) {
                    onVariableClick(segment.content, e.currentTarget);
                  }
                }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: '#06b6d4',
                  padding: '1px 3px',
                  cursor: 'pointer',
                  borderBottom: '1px dashed #06b6d4',
                  fontSize: '10px',
                }}
              >
                {segment.content}
              </span>
            );

          case 'value':
            return (
              <span
                key={key}
                onClick={(e) => {
                  if (onValueClick) {
                    onValueClick(segment.content.replace(/n$/, ''), e.currentTarget);
                  }
                }}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#f59e0b',
                  padding: '1px 3px',
                  cursor: onValueClick ? 'pointer' : 'default',
                  fontSize: '10px',
                }}
              >
                {segment.content.replace(/n$/, '')}
              </span>
            );

          case 'msgSender':
          case 'thisRef':
            return (
              <span
                key={key}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'rgba(251, 146, 60, 0.15)',
                  color: '#fb923c',
                  padding: '1px 3px',
                  fontSize: '10px',
                  borderBottom: '1px dotted #fb923c',
                }}
              >
                {segment.content}
              </span>
            );

          default:
            return <span key={key}>{segment.content}</span>;
        }
      })}
    </span>
  );
}

// ============ Tooltip Component ============

interface TooltipProps {
  term: GlossaryTerm;
  termKey: string;
  position: { x: number; y: number };
  onClose: () => void;
  onMouseEnter: () => void;
  // Callbacks for clickable elements inside tooltip
  onMethodClick?: (methodName: string, element: HTMLElement) => void;
  onFheClick?: (fheMethod: string, element: HTMLElement) => void;
  onValueClick?: (value: string, element: HTMLElement) => void;
  onVariableClick?: (variable: string, element: HTMLElement) => void;
}

function Tooltip({ term, termKey, position, onClose, onMouseEnter, onMethodClick, onFheClick, onValueClick, onVariableClick }: TooltipProps) {
  const [expanded, setExpanded] = useState(false);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [showAbove, setShowAbove] = useState(false);
  const color = CATEGORY_COLORS[term.category];

  // Calculate position ONCE on mount - estimate expanded height
  React.useLayoutEffect(() => {
    // Estimate: collapsed ~80px, expanded ~250px
    const estimatedExpandedHeight = 280;
    const spaceBelow = window.innerHeight - position.y;
    const spaceAbove = position.y;

    // If not enough space below for expanded content, show above
    if (spaceBelow < estimatedExpandedHeight && spaceAbove > spaceBelow) {
      setShowAbove(true);
    }
  }, [position.y]); // Only on mount/position change, NOT on expand

  // Handle expand button click - prevent event propagation
  const handleExpandClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setExpanded(prev => !prev);
  }, []);

  // Gap between trigger and tooltip
  const GAP = 16;

  // Delayed close - gives time to move mouse around
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterTooltip = useCallback(() => {
    // Cancel any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    onMouseEnter();
  }, [onMouseEnter]);

  const handleMouseLeaveTooltip = useCallback(() => {
    // Delay close to allow moving to other parts
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Calculate max height based on available space
  const maxHeight = showAbove
    ? position.y - GAP - 10 // Space above trigger
    : window.innerHeight - position.y - GAP - 10; // Space below trigger

  return (
    <div
      ref={tooltipRef}
      onMouseEnter={handleMouseEnterTooltip}
      onMouseLeave={handleMouseLeaveTooltip}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: Math.min(position.x, window.innerWidth - 320),
        ...(showAbove
          ? { bottom: window.innerHeight - position.y + GAP }
          : { top: position.y + GAP }
        ),
        zIndex: 1000,
        width: '300px',
      }}
    >
      {/* Speech bubble arrow - outside scrollable area */}
      <div
        style={{
          position: 'absolute',
          left: '24px',
          ...(showAbove
            ? {
                bottom: '-8px',
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `8px solid ${color}`,
              }
            : {
                top: '-8px',
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: `8px solid ${color}`,
              }
          ),
          width: 0,
          height: 0,
          zIndex: 1001,
        }}
      />

      {/* Tooltip content - scrollable */}
      <div
        style={{
          maxHeight: Math.min(maxHeight, 400),
          overflowY: 'auto',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${color}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
        }}
      >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
        }}
      >
        <span style={{ fontWeight: 600, color }}>
          {termKey}
        </span>
        <span
          style={{
            fontSize: '9px',
            color: 'var(--fg-muted)',
            textTransform: 'uppercase',
            background: 'var(--bg)',
            padding: '2px 6px',
          }}
        >
          {term.category.replace('-', ' ')}
        </span>
      </div>

      {/* Short description */}
      <div style={{ padding: '8px 12px', color: 'var(--fg)' }}>
        {term.short}
      </div>

      {/* Expand button */}
      {term.long && (
        <button
          onClick={handleExpandClick}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            padding: '6px 12px',
            background: 'var(--bg-secondary)',
            border: 'none',
            borderTop: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--accent)',
            fontSize: '10px',
            textAlign: 'left',
          }}
        >
          {expanded ? '- Close' : '+ Details'}
        </button>
      )}

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)' }}>
          <div style={{ color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: term.example ? '8px' : 0 }}>
            <TooltipSmartText
              text={term.long}
              onMethodClick={onMethodClick}
              onFheClick={onFheClick}
              onValueClick={onValueClick}
              onVariableClick={onVariableClick}
            />
          </div>

          {term.example && (
            <div
              style={{
                display: 'block',
                padding: '6px 8px',
                background: 'var(--bg)',
                color: 'var(--fg)',
                borderLeft: `2px solid ${color}`,
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
              }}
            >
              <TooltipSmartText
                text={term.example}
                onMethodClick={onMethodClick}
                onFheClick={onFheClick}
                onValueClick={onValueClick}
                onVariableClick={onVariableClick}
              />
            </div>
          )}

          {term.related && term.related.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--fg-muted)', fontSize: '9px' }}>Related:</span>
              {term.related.map((r) => (
                <span
                  key={r}
                  style={{
                    fontSize: '9px',
                    color: 'var(--accent)',
                    background: 'var(--bg)',
                    padding: '1px 4px',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// ============ Segment Renderers ============

interface SegmentProps {
  segment: ParsedSegment;
  onMethodClick?: (methodName: string, element: HTMLElement) => void;
  onFheClick?: (fheMethod: string, element: HTMLElement) => void;
  onValueClick?: (value: string, element: HTMLElement) => void;
  onVariableClick?: (variable: string, element: HTMLElement) => void;
  disableTooltips?: boolean;
}

function SegmentRenderer({ segment, onMethodClick, onFheClick, onValueClick, onVariableClick, disableTooltips }: SegmentProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get term for this segment
  const term = useMemo(() => {
    if (segment.type === 'term' && segment.termKey) {
      return getTerm(segment.termKey);
    }
    if (segment.type === 'fheCall') {
      // Try to find FHE.xxx in glossary
      const fheKey = segment.content.replace(/\(\)$/, '');
      return getTerm(fheKey);
    }
    if (segment.type === 'method' && segment.methodName) {
      // Try to find contract method in glossary
      return getTerm(segment.methodName);
    }
    if (segment.type === 'msgSender' || segment.type === 'thisRef') {
      // Solidity keywords - lookup by content
      return getTerm(segment.content);
    }
    return undefined;
  }, [segment]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    // Don't show tooltips if disabled
    if (disableTooltips) return;

    // Clear any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsHovering(true);
    if (term) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({ x: rect.left, y: rect.bottom });
    }
  }, [term, disableTooltips]);

  const handleMouseLeave = useCallback(() => {
    // Delay closing to allow moving to tooltip
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
      setTooltip(null);
    }, 150);
  }, []);

  const handleTooltipMouseEnter = useCallback(() => {
    // Cancel close when entering tooltip
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsHovering(true);
  }, []);

  const handleTooltipClose = useCallback(() => {
    setIsHovering(false);
    setTooltip(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    // Flash animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);

    const element = e.currentTarget;

    // Callbacks
    if (segment.type === 'method' && onMethodClick && segment.methodName) {
      onMethodClick(segment.methodName, element);
    }
    if (segment.type === 'fheCall' && onFheClick) {
      onFheClick(segment.content.replace(/\(\)$/, ''), element);
    }
  }, [segment, onMethodClick, onFheClick]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Render based on type
  switch (segment.type) {
    case 'text':
      return <span>{segment.content}</span>;

    case 'method':
      return (
        <>
          <span
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: isFlashing ? 'var(--accent)' : 'rgba(236, 72, 153, 0.15)',
              color: isFlashing ? '#000' : '#ec4899',
              padding: '1px 4px',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              borderBottom: term ? '1px solid #ec4899' : '1px dashed #ec4899',
            }}
          >
            {segment.content}
          </span>
          {tooltip && term && segment.methodName && (
            <Tooltip
              term={term}
              termKey={segment.methodName}
              position={tooltip}
              onClose={handleTooltipClose}
              onMouseEnter={handleTooltipMouseEnter}
              onMethodClick={onMethodClick}
              onFheClick={onFheClick}
              onValueClick={onValueClick}
              onVariableClick={onVariableClick}
            />
          )}
        </>
      );

    case 'fheCall':
      return (
        <>
          <span
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: isFlashing ? 'var(--accent)' : 'rgba(139, 92, 246, 0.2)',
              color: isFlashing ? '#000' : '#8b5cf6',
              padding: '1px 4px',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              borderBottom: '1px dashed #8b5cf6',
            }}
          >
            {segment.content}
          </span>
          {tooltip && term && (
            <Tooltip
              term={term}
              termKey={segment.content.replace(/\(\)$/, '')}
              position={tooltip}
              onClose={handleTooltipClose}
              onMouseEnter={handleTooltipMouseEnter}
              onMethodClick={onMethodClick}
              onFheClick={onFheClick}
              onValueClick={onValueClick}
              onVariableClick={onVariableClick}
            />
          )}
        </>
      );

    case 'value':
      // Remove BigInt 'n' suffix if present
      const displayValue = segment.content.replace(/n$/, '');
      return (
        <span
          onClick={(e) => {
            if (onValueClick) {
              onValueClick(displayValue, e.currentTarget);
            }
          }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            padding: '1px 4px',
            cursor: onValueClick ? 'pointer' : 'default',
            borderBottom: onValueClick ? '1px dashed #f59e0b' : 'none',
          }}
        >
          {displayValue}
        </span>
      );

    case 'variable':
      return (
        <span
          onClick={(e) => {
            if (onVariableClick) {
              onVariableClick(segment.content, e.currentTarget);
            }
          }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#06b6d4',
            padding: '1px 4px',
            cursor: onVariableClick ? 'pointer' : 'default',
            borderBottom: onVariableClick ? '1px dashed #06b6d4' : 'none',
          }}
        >
          {segment.content}
        </span>
      );

    case 'address':
      // Ethereum address - green/emerald color
      return (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            padding: '1px 4px',
            borderRadius: '2px',
            fontSize: '0.9em',
          }}
          title="Ethereum Address"
        >
          {segment.content}
        </span>
      );

    case 'paramRef':
      // Parameter reference like bob.address - teal color
      return (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(20, 184, 166, 0.15)',
            color: '#14b8a6',
            padding: '1px 4px',
            borderRadius: '2px',
          }}
        >
          {segment.content}
        </span>
      );

    case 'txHash':
      // Transaction hash with arrow - purple/violet color
      return (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#a78bfa',
            padding: '2px 6px',
            borderRadius: '3px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            fontSize: '0.85em',
          }}
        >
          {segment.content}
        </span>
      );

    case 'msgSender':
    case 'thisRef':
      // Solidity keywords - use glossary tooltip (term already computed above)
      return (
        <>
          <span
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: 'rgba(251, 146, 60, 0.15)',
              color: '#fb923c',
              padding: '1px 4px',
              borderRadius: '2px',
              borderBottom: term ? '1px dotted #fb923c' : 'none',
              cursor: term ? 'help' : 'default',
            }}
          >
            {segment.content}
          </span>
          {tooltip && term && (
            <Tooltip
              term={term}
              termKey={segment.content}
              position={tooltip}
              onClose={handleTooltipClose}
              onMouseEnter={handleTooltipMouseEnter}
              onMethodClick={onMethodClick}
              onFheClick={onFheClick}
              onValueClick={onValueClick}
              onVariableClick={onVariableClick}
            />
          )}
        </>
      );

    case 'term':
      return (
        <>
          <span
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              borderBottom: '1px dotted var(--fg-muted)',
              cursor: 'help',
            }}
          >
            {segment.content}
          </span>
          {tooltip && term && segment.termKey && (
            <Tooltip
              term={term}
              termKey={segment.termKey}
              position={tooltip}
              onClose={handleTooltipClose}
              onMouseEnter={handleTooltipMouseEnter}
              onMethodClick={onMethodClick}
              onFheClick={onFheClick}
              onValueClick={onValueClick}
              onVariableClick={onVariableClick}
            />
          )}
        </>
      );

    default:
      return <span>{segment.content}</span>;
  }
}

// ============ Main Component ============

export function SmartText({
  text,
  onMethodClick,
  onFheClick,
  onValueClick,
  onVariableClick,
  className,
  disableTooltips,
}: SmartTextProps) {
  const segments = useMemo(() => parseText(text), [text]);

  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <SegmentRenderer
          key={`${segment.type}-${index}`}
          segment={segment}
          onMethodClick={onMethodClick}
          onFheClick={onFheClick}
          onValueClick={onValueClick}
          onVariableClick={onVariableClick}
          disableTooltips={disableTooltips}
        />
      ))}
    </span>
  );
}

// ============ Export for testing ============
export { parseText, type ParsedSegment };
