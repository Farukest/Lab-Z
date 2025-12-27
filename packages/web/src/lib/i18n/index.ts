/**
 * i18n System - Internationalization for Lab-Z
 *
 * Usage:
 *   import { useTranslation, I18nProvider } from '@/lib/i18n';
 *
 *   // In _app or layout:
 *   <I18nProvider>
 *     <App />
 *   </I18nProvider>
 *
 *   // In components:
 *   const { t, language, setLanguage } = useTranslation();
 *   <p>{t.common.back}</p>
 */

export * from './types';
export * from './context';
export { en } from './translations/en';
export { tr } from './translations/tr';
