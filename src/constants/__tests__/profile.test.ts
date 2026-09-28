import { describe, expect, it } from 'vitest';
import { languageOptions, settingMenus } from '../profile';

describe('languageOptions', () => {
  it('offers exactly Indonesian and English', () => {
    expect(languageOptions).toEqual([
      { code: 'id', label: 'Indonesian' },
      { code: 'en', label: 'English' }
    ]);
  });
});

describe('settingMenus', () => {
  it('has exactly 2 items (Settings removed)', () => {
    expect(settingMenus).toHaveLength(2);
  });

  it('does not contain Settings', () => {
    const nameKeys = settingMenus.map(m => m.nameKey);
    expect(nameKeys).not.toContain('settings');
  });

  it.each([
    { nameKey: 'delete_account', link: '/remove-account', icon: 'trash2' },
    { nameKey: 'log_out', link: '/logout', icon: 'logout' }
  ])('$nameKey has link $link and icon $icon', item => {
    const found = settingMenus.find(m => m.nameKey === item.nameKey);
    expect(found?.link).toBe(item.link);
    expect(found?.icon).toBe(item.icon);
  });
});
