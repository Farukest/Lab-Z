"use client";

import { useTranslation } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'minimal';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const { language, setLanguage, languages } = useTranslation();

  const handleChange = (lang: Language) => {
    setLanguage(lang);
  };

  // Minimal variant - just code (EN/TR)
  if (variant === 'minimal') {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {(Object.keys(languages) as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            title={languages[lang].nativeName}
            style={{
              padding: '4px 8px',
              background: language === lang ? 'var(--accent)' : 'transparent',
              border: language === lang ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: language === lang ? 600 : 400,
              color: language === lang ? '#000' : 'var(--fg)',
              transition: 'all 0.15s ease',
            }}
          >
            {languages[lang].code}
          </button>
        ))}
      </div>
    );
  }

  // Compact variant - just code
  if (variant === 'compact') {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {(Object.keys(languages) as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            title={languages[lang].nativeName}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
              background: language === lang ? 'var(--accent)' : 'var(--bg-secondary)',
              border: language === lang ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              color: language === lang ? '#000' : 'var(--fg)',
              fontWeight: language === lang ? 600 : 400,
              transition: 'all 0.15s ease',
            }}
          >
            {languages[lang].code}
          </button>
        ))}
      </div>
    );
  }

  // Default variant - code only
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {(Object.keys(languages) as Language[]).map((lang) => (
        <button
          key={lang}
          onClick={() => handleChange(lang)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 10px',
            background: language === lang ? 'var(--accent)' : 'var(--bg-secondary)',
            border: language === lang ? '1px solid var(--accent)' : '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            color: language === lang ? '#000' : 'var(--fg)',
            fontWeight: language === lang ? 600 : 400,
            transition: 'all 0.15s ease',
          }}
        >
          {languages[lang].code}
        </button>
      ))}
    </div>
  );
}

// Dropdown variant for header
export function LanguageDropdown() {
  const { language, setLanguage, languages } = useTranslation();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      style={{
        padding: '4px 8px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: 'var(--fg)',
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', monospace",
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {(Object.keys(languages) as Language[]).map((lang) => (
        <option key={lang} value={lang}>
          {languages[lang].code}
        </option>
      ))}
    </select>
  );
}
