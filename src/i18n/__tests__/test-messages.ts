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

/** Signature of the t() function returned by useTranslations. */
export type TestTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string;

/**
 * Creates a useTranslations mock that resolves dotted keys and {placeholder}
 * values from the real English message JSON for the requested namespace.
 *
 * Unknown namespaces and unknown keys fall back to returning the key itself.
 *
 * @returns A useTranslations-compatible function taking a namespace name.
 */
export function createUseTranslationsMock(): (
  namespace: string
) => TestTranslate {
  return (namespace: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const messages =
        NAMESPACE_MESSAGES[namespace] ?? NAMESPACE_MESSAGES.common;
      const found = key
        .split('.')
        .reduce<unknown>(
          (node, part) =>
            node && typeof node === 'object'
              ? (node as Record<string, unknown>)[part]
              : undefined,
          messages
        );
      const template = typeof found === 'string' ? found : key;
      return template.replace(/\{(\w+)\}/g, (_, name: string) =>
        String(values?.[name] ?? '')
      );
    };
}
