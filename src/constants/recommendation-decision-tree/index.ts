import type { DecisionDomain } from '@/types/recommendation-interview';
import environmental from './domains/environmental';
import functional from './domains/functional';
import lifestyle from './domains/lifestyle';
import meaning from './domains/meaning';
import mental from './domains/mental';
import physical from './domains/physical';
import social from './domains/social';

/**
 * Deterministic recommendation decision tree — single source of truth for
 * chief-complaint branches. Each complaint carries ICF-domain feature keywords;
 * the canonical NUCC specialty is resolved from the generated ontology map
 * (drives `/api/recommendations?specialty=`).
 */
export const DECISION_TREE: DecisionDomain[] = [
  physical,
  mental,
  social,
  functional,
  meaning,
  lifestyle,
  environmental
];

/**
 * Top-5 prevalence chief complaints from primary-care research, surfaced
 * as one-tap quick chips in the complaint search entry point.
 */
export const QUICK_COMPLAINT_IDS = [
  'burnout',
  'anxiety-stress',
  'gastrointestinal',
  'pain-musculoskeletal',
  'fever-malaise'
] as const;
