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

const EXPECTED_NAMESPACES = [
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

  it.each([{ locale: 'en' }, { locale: 'id' }])(
    'returns the complete messages record for the $locale locale',
    async ({ locale }) => {
      const { default: getConfig } = await import('../request');
      const config = await getConfig({
        locale,
        requestLocale: Promise.resolve(locale)
      });
      expect(Object.keys(config.messages).sort()).toEqual(
        [...EXPECTED_NAMESPACES].sort()
      );
      for (const namespace of EXPECTED_NAMESPACES) {
        expect(config.messages[namespace]).toBeTypeOf('object');
      }
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

  describe('loadNamespace', () => {
    it('resolves to a [namespace, messages] tuple for an existing namespace', async () => {
      const { loadNamespace } = await import('../request');
      const entry = await loadNamespace('en', 'common');
      expect(entry).not.toBeNull();
      expect(entry?.[0]).toBe('common');
      expect(entry?.[1]).toBeTypeOf('object');
    });

    it('resolves to null for a missing namespace without throwing', async () => {
      const { loadNamespace } = await import('../request');
      const entry = await loadNamespace('en', 'does-not-exist');
      expect(entry).toBeNull();
    });
  });

  it('loadMessages skips missing namespaces without failing', async () => {
    const { loadMessages } = await import('../request');
    const messages = await loadMessages('en');
    expect(Object.keys(messages).sort()).toEqual(
      [...EXPECTED_NAMESPACES].sort()
    );
    expect(messages.doesNotExist).toBeUndefined();
  });
});
