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
  'page-header',
  'admin'
] as const;

/**
 * Loads the messages for a single namespace via dynamic import.
 *
 * @param locale - The locale whose message file to load.
 * @param namespace - The message namespace (file name without extension).
 * @returns A [namespace, messages] tuple, or null when the file is missing.
 */
export const loadNamespace = async (
  locale: string,
  namespace: string
): Promise<[string, Record<string, unknown>] | null> => {
  try {
    // skipcq - NOSONAR - template-literal import() is required for Next.js
    // namespace code-splitting: each messages/<locale>/<namespace>.json must
    // become its own lazy chunk, so a static import list is not possible.
    // locale and namespace are constrained to the LOCALES and NAMESPACES
    // constants in this module and are never user input.
    const mod = (await import(`../messages/${locale}/${namespace}.json`)) as {
      default: Record<string, unknown>;
    };
    return [namespace, mod.default];
  } catch {
    // Namespace file missing; skip
    return null;
  }
};

/**
 * Loads all namespace messages for a locale concurrently.
 * Missing namespace files are skipped rather than failing the whole load.
 *
 * @param locale - The locale whose messages to load.
 * @returns A record mapping each loaded namespace to its messages.
 */
export const loadMessages = async (
  locale: string
): Promise<Record<string, Record<string, unknown>>> => {
  const entries = await Promise.all(
    NAMESPACES.map(namespace => loadNamespace(locale, namespace))
  );
  return Object.fromEntries(entries.filter(entry => entry !== null));
};

export default getRequestConfig(async ({ locale }) => {
  // Validate locale
  const validLocale = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : 'id';

  // Load all namespace messages for this locale
  const messages = await loadMessages(validLocale);

  return {
    locale: validLocale,
    messages
  };
});
