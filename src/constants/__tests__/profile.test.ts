import { describe, expect, it } from 'vitest';
import { settingMenus } from '../profile';

describe('settingMenus', () => {
  it('has exactly 2 items (Settings removed)', () => {
    expect(settingMenus).toHaveLength(2);
  });

  it('does not contain Settings', () => {
    const names = settingMenus.map(m => m.name);
    expect(names).not.toContain('Settings');
  });

  it.each([
    { name: 'Delete Account', link: '/remove-account', icon: 'trash2' },
    { name: 'Log out', link: '/logout', icon: 'logout' }
  ])('$name has link $link and icon $icon', item => {
    const found = settingMenus.find(m => m.name === item.name);
    expect(found?.link).toBe(item.link);
    expect(found?.icon).toBe(item.icon);
  });
});
