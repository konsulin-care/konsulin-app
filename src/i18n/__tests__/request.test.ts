import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl/server', () => ({
  getRequestConfig: vi.fn(
    (
      configFn: (opts: {
        locale: string;
        requestLocale?: Promise<string>;
      }) => unknown
    ) => configFn
  )
}));

vi.mock('@/lib/locale', () => ({
  getLocale: vi.fn(() => 'en'),
  DEFAULT_LOCALE: 'id',
  LOCALES: ['en', 'id']
}));

describe('i18n request config', () => {
  it.each([
    { locale: 'en', message: 'Save' },
    { locale: 'id', message: 'Simpan' }
  ])(
    'loads $locale messages for the $locale locale',
    async ({ locale, message }) => {
      const { default: getConfig } = await import('../request');
      const config = await getConfig({
        locale,
        requestLocale: Promise.resolve(locale)
      });
      expect(config.locale).toBe(locale);
      expect(config.messages.common.save).toBe(message);
    }
  );

  it('falls back to id for an unknown locale', async () => {
    const { default: getConfig } = await import('../request');
    const config = await getConfig({
      locale: 'fr',
      requestLocale: Promise.resolve('fr')
    });
    expect(config.locale).toBe('id');
  });
});
