import type { createUseTranslationsMock } from '@/i18n/__tests__/test-messages';

/** Module shape returned by the mock factory. */
type I18nMockModule = {
  useTranslations: ReturnType<typeof createUseTranslationsMock>;
};

/**
 * Shared vi.mock factory for the `@/i18n` module. Wraps
 * createUseTranslationsMock so test files can consume it via dynamic import
 * inside an async vi.mock factory (hoisting-safe).
 *
 * @returns Mocked i18n module exposing `useTranslations`.
 */
export async function i18nMockFactory(): Promise<I18nMockModule> {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
}
