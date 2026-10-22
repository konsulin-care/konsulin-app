import { describe, expect, it } from 'vitest';
import {
  genderList,
  languageOptions,
  medalLists,
  settingMenus
} from '../profile';

describe('medalLists', () => {
  it('keeps role titles in English as brand copy, not i18n keys', () => {
    expect(medalLists.length).toBeGreaterThan(0);
    for (const medal of medalLists) {
      expect(medal.title).toBe('Survivor');
    }
  });
});

describe('languageOptions', () => {
  it('offers exactly Indonesian and English via translation keys', () => {
    expect(languageOptions).toEqual([
      { code: 'id', labelKey: 'profile.lang_id' },
      { code: 'en', labelKey: 'profile.lang_en' }
    ]);
  });
});

describe('genderList', () => {
  it('offers male and female via translation keys, not display text', () => {
    expect(genderList).toEqual([
      { nameKey: 'profile.gender_male', code: 'male' },
      { nameKey: 'profile.gender_female', code: 'female' }
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
