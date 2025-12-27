"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Language, Translations } from './types';
import { DEFAULT_LANGUAGE, LANGUAGES } from './types';
import { en } from './translations/en';
import { tr } from './translations/tr';

// All translations map
const translations: Record<Language, Translations> = {
  en,
  tr,
};

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'labz-language';

// Context type
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  languages: typeof LANGUAGES;
}

// Create context
const I18nContext = createContext<I18nContextType | null>(null);

// Provider component
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [mounted, setMounted] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored && (stored === 'en' || stored === 'tr')) {
        setLanguageState(stored as Language);
      }
    } catch {
      // Ignore localStorage errors
    }
    setMounted(true);
  }, []);

  // Set language and persist
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Get translations for current language
  const t = translations[language];

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ language: DEFAULT_LANGUAGE, setLanguage, t: translations[DEFAULT_LANGUAGE], languages: LANGUAGES }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook to use translations
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

// Helper to interpolate strings like "Step {current} of {total}"
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
