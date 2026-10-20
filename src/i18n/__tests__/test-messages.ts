import enAssessment from '@/messages/en/assessment.json';
import enCommon from '@/messages/en/common.json';
import enHome from '@/messages/en/home.json';
import enInterview from '@/messages/en/interview.json';
import enPageHeader from '@/messages/en/page-header.json';
import enProfile from '@/messages/en/profile.json';
import enResearch from '@/messages/en/research.json';
import enToast from '@/messages/en/toast.json';

/** Per-namespace English messages keyed by namespace name. */
const NAMESPACE_MESSAGES: Record<string, unknown> = {
  assessment: enAssessment,
  common: enCommon,
  home: enHome,
  interview: enInterview,
  'page-header': enPageHeader,
  profile: enProfile,
  research: enResearch,
  toast: enToast
};

/**
 * Reads an own property from a record by variable key.
 *
 * Single documented suppression for the four Codacy object-injection sinks
 * in this file: keys are developer-defined namespace/message names from test
 * fixtures, never user input, and Object.hasOwn blocks prototype-chain access.
 *
 * @param record - Object to read from.
 * @param key - Property name to look up.
 * @returns The own-property value, or undefined if absent.
 */
function pick(record: object, key: string): unknown {
  if (!Object.hasOwn(record, key)) {
    return undefined;
  }
  return (record as Record<string, unknown>)[key]; // NOSONAR: documented above; guarded by Object.hasOwn
}

/** Signature of the t() function returned by useTranslations. */
export type TestTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string;

/**
 * Creates a useTranslations mock that resolves dotted keys and {placeholder}
 * values from the real English message JSON for the requested namespace.
 *
 * When the namespace is undefined or empty, keys resolve against the
 * namespace root so cross-namespace dotted keys like 'profile.gender_male'
 * work (mirrors components calling useTranslations() with no argument).
 * Unknown namespaces and unknown keys fall back to returning the key itself.
 *
 * @returns A useTranslations-compatible function taking an optional namespace.
 */
export function createUseTranslationsMock(): (
  namespace?: string
) => TestTranslate {
  return (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const messages =
        namespace === undefined || namespace === ''
          ? NAMESPACE_MESSAGES
          : (pick(NAMESPACE_MESSAGES, namespace) ?? NAMESPACE_MESSAGES.common);
      const deep = key
        .split('.')
        .reduce<unknown>(
          (node, part) =>
            node && typeof node === 'object' ? pick(node, part) : undefined,
          messages
        );
      // next-intl falls back to the full dotted key as a flat lookup.
      const flat = pick(messages as object, key);
      const found = typeof deep === 'string' ? deep : flat;
      const template = typeof found === 'string' ? found : key;
      return template.replace(/\{(\w+)\}/g, (_, name: string) => {
        const found = values === undefined ? undefined : pick(values, name);
        return String(
          typeof found === 'string' || typeof found === 'number' ? found : ''
        );
      });
    };
}
