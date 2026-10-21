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
type Namespace = (typeof NAMESPACES)[number];

type MessagesModule = { default: Record<string, unknown> };
type NamespaceLoader = () => Promise<MessagesModule>;

/**
 * Static per-locale loader registry. Each locale maps to a Map of
 * namespace loaders whose values are arrow functions with literal
 * import() paths, so every import stays statically analyzable (Codacy)
 * while preserving per-namespace chunks.
 */
const LOADER_REGISTRY: Map<Locale, Map<Namespace, NamespaceLoader>> = new Map<
  Locale,
  Map<Namespace, NamespaceLoader>
>([
  [
    'en',
    new Map<Namespace, NamespaceLoader>([
      ['common', () => import('../messages/en/common.json')],
      ['profile', () => import('../messages/en/profile.json')],
      ['home', () => import('../messages/en/home.json')],
      ['assessment', () => import('../messages/en/assessment.json')],
      ['auth', () => import('../messages/en/auth.json')],
      ['interview', () => import('../messages/en/interview.json')],
      ['research', () => import('../messages/en/research.json')],
      ['toast', () => import('../messages/en/toast.json')],
      ['page-header', () => import('../messages/en/page-header.json')],
      ['admin', () => import('../messages/en/admin.json')]
    ])
  ],
  [
    'id',
    new Map<Namespace, NamespaceLoader>([
      ['common', () => import('../messages/id/common.json')],
      ['profile', () => import('../messages/id/profile.json')],
      ['home', () => import('../messages/id/home.json')],
      ['assessment', () => import('../messages/id/assessment.json')],
      ['auth', () => import('../messages/id/auth.json')],
      ['interview', () => import('../messages/id/interview.json')],
      ['research', () => import('../messages/id/research.json')],
      ['toast', () => import('../messages/id/toast.json')],
      ['page-header', () => import('../messages/id/page-header.json')],
      ['admin', () => import('../messages/id/admin.json')]
    ])
  ]
]);

/**
 * Type guard checking whether a string is a supported locale.
 *
 * @param value - The string to check.
 * @returns True when the value is a member of LOCALES.
 */
const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

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
  if (!isLocale(locale)) {
    return null;
  }
  const localeLoaders = LOADER_REGISTRY.get(locale);
  const loader = localeLoaders?.get(namespace as Namespace);
  if (!loader) {
    return null;
  }
  const mod = await loader();
  return [namespace, mod.default];
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
  const validLocale = isLocale(locale) ? locale : 'id';

  // Load all namespace messages for this locale
  const messages = await loadMessages(validLocale);

  return {
    locale: validLocale,
    messages
  };
});
