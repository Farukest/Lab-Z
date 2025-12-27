"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: 'var(--fg-muted)'
      }}>
        <Search style={{ width: '14px', height: '14px' }} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "search..."}
        style={{
          width: '100%',
          padding: '10px 40px 10px 36px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          color: 'var(--fg)',
          fontSize: '13px',
          fontFamily: "'JetBrains Mono', monospace"
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex'
          }}
        >
          <X style={{ width: '14px', height: '14px' }} />
        </button>
      )}
    </div>
  );
}
