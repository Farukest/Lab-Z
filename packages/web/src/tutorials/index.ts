/**
 * Tutorial Registry
 *
 * Template ID'ye göre tutorial'ları export eder.
 * Yeni tutorial eklemek için:
 * 1. [template-id].tutorial.ts dosyası oluştur
 * 2. Buraya import et ve TUTORIALS objesine ekle
 */

import { Tutorial } from './types';
import { handleJourneyTutorial } from './handle-journey.tutorial';
import { predictionMarketTutorial } from './prediction-market.tutorial';
import { ageGateTutorial } from './age-gate.tutorial';
import { handleVsValueTutorial } from './handle-vs-value.tutorial';
import { counterTutorial } from './counter.tutorial';
import { booleanTutorial } from './boolean.tutorial';

// Template ID → Tutorial mapping
export const TUTORIALS: Record<string, Tutorial> = {
  'handle-journey': handleJourneyTutorial,
  'prediction-market': predictionMarketTutorial,
  'age-gate': ageGateTutorial,
  'handle-vs-value': handleVsValueTutorial,
  'counter': counterTutorial,
  'boolean': booleanTutorial,
};

// Helper: Template ID'ye göre tutorial getir
export function getTutorialByTemplateId(templateId: string): Tutorial | null {
  return TUTORIALS[templateId] || null;
}

// Helper: Tüm tutorial ID'lerini listele
export function getAvailableTutorialIds(): string[] {
  return Object.keys(TUTORIALS);
}

// Re-export types
export * from './types';

// Re-export individual tutorials
export { handleJourneyTutorial } from './handle-journey.tutorial';
export { predictionMarketTutorial } from './prediction-market.tutorial';
export { ageGateTutorial } from './age-gate.tutorial';
export { handleVsValueTutorial } from './handle-vs-value.tutorial';
export { counterTutorial } from './counter.tutorial';
export { booleanTutorial } from './boolean.tutorial';
