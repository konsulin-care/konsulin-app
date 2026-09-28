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
  it('loads English messages for the en locale', async () => {
    const { default: getConfig } = await import('../request');
    const config = await getConfig({
      locale: 'en',
      requestLocale: Promise.resolve('en')
    });
    expect(config.locale).toBe('en');
    expect(config.messages.common.save).toBe('Save');
  });

  it('loads Indonesian messages for the id locale', async () => {
    const { default: getConfig } = await import('../request');
    const config = await getConfig({
      locale: 'id',
      requestLocale: Promise.resolve('id')
    });
    expect(config.locale).toBe('id');
    expect(config.messages.common.save).toBe('Simpan');
  });

  it('falls back to id for an unknown locale', async () => {
    const { default: getConfig } = await import('../request');
    const config = await getConfig({
      locale: 'fr',
      requestLocale: Promise.resolve('fr')
    });
    expect(config.locale).toBe('id');
  });
});
