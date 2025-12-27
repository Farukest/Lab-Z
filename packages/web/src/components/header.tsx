"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Github, Blocks, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themes = [
    { value: "light", icon: Sun, label: "light" },
    { value: "dark", icon: Moon, label: "dark" },
    { value: "dim", icon: Monitor, label: "dim" },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)'
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '0 16px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <img src="/logo.svg" alt="Lab-Z" width={20} height={20} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: '14px' }}>
            Lab-Z
          </span>
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Know-How Builder Link */}
          <Link
            href="/#templates"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <GraduationCap style={{ width: '14px', height: '14px' }} />
            Know-How
          </Link>

          {/* Visual Builder Link */}
          <Link
            href="/compose"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--accent)',
              color: '#000',
              fontSize: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <Blocks style={{ width: '14px', height: '14px' }} />
            Visual Builder
          </Link>

          {/* Theme switcher */}
          {mounted && (
            <div style={{ display: 'flex', gap: '2px' }}>
              {themes.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  style={{
                    padding: '6px',
                    background: theme === value ? 'var(--bg-secondary)' : 'transparent',
                    border: theme === value ? '1px solid var(--border)' : '1px solid transparent',
                    color: theme === value ? 'var(--fg)' : 'var(--fg-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={label}
                >
                  <Icon style={{ width: '14px', height: '14px' }} />
                </button>
              ))}
            </div>
          )}

          {/* CLI Command */}
          <div className="prompt" style={{
            display: 'none',
            padding: '4px 8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--fg-muted)'
          }}>
            npx Lab-Z create
          </div>

          {/* GitHub */}
          <a
            href="https://github.com/Lab-Z"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px',
              color: 'var(--fg-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
            title="GitHub"
          >
            <Github style={{ width: '16px', height: '16px' }} />
          </a>
        </div>
      </div>
    </header>
  );
}
