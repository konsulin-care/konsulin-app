import { FhirSystems } from './extensions';

/**
 * Extract a Lucide icon name from a Questionnaire's code array.
 *
 * Searches for a code entry with system=https://lucide.dev/icons
 * and converts the kebab-case code to PascalCase.
 *
 * @param codes - Array of FHIR Codings from Questionnaire.code
 * @returns PascalCase icon name (e.g. "SquaresSubtract") or null
 */
export function getLucideIconName(
  codes: Array<{ system?: string; code?: string }> | undefined
): string | null {
  const iconCode = codes?.find(c => c.system === FhirSystems.lucide)?.code;
  if (!iconCode) return null;
  return iconCode
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/**
 * Default Lucide icon names per assessment category.
 *
 * Used as fallback when a questionnaire has no explicit icon code.
 * Seven categories covering the health and well-being spectrum.
 */
export const CATEGORY_DEFAULT_ICONS: Record<string, string> = {
  'physical-health': 'Heart',
  'mental-emotional-health': 'Brain',
  'social-health-relationships': 'Users',
  'functional-capacity': 'Accessibility',
  'meaning-purpose-fulfilment': 'Sparkles',
  'health-behaviours-lifestyle': 'Activity',
  'environmental-contextual': 'Building'
};
