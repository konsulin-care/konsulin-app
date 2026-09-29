import { getRequestConfig } from 'next-intl/server';

const LOCALES = ['en', 'id'] as const;
type Locale = (typeof LOCALES)[number];

const NAMESPACES = [
  'common',
  'profile',
  'home',
  'assessment',
  'auth',
  'interview',
  'research',
  'toast',
  'page-header'
] as const;

export default getRequestConfig(async ({ locale }) => {
  // Validate locale
  const validLocale = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : 'id';

  // Load all namespace messages for this locale
  const messages: Record<string, Record<string, unknown>> = {};
  for (const namespace of NAMESPACES) {
    try {
      const mod = (await import(
        `../messages/${validLocale}/${namespace}.json`
      )) as { default: Record<string, unknown> };
      messages[namespace] = mod.default;
    } catch {
      // Namespace file missing; skip
    }
  }

  return {
    locale: validLocale,
    messages
  };
});
