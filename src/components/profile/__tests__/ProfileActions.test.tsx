import ProfileActions from '@/components/profile/ProfileActions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

describe('jsdom polyfills for vaul', () => {
  it('should provide setPointerCapture on Element prototype', () => {
    const el = document.createElement('div');
    expect(() => el.setPointerCapture(1)).not.toThrow();
  });

  it('should provide releasePointerCapture on Element prototype', () => {
    const el = document.createElement('div');
    expect(() => el.releasePointerCapture(1)).not.toThrow();
  });
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      delete_account: 'Delete Account',
      log_out: 'Log out',
      logout_title: 'Are you sure you want to log out?',
      logout_desc:
        'You need to login again and the notification will not appear if you log out',
      logout_confirm: 'Yes, log me out',
      delete_title: 'Are you sure you want to delete your account?',
      delete_desc:
        'You cannot retrieve any data from this account in the app if you delete your account.',
      delete_confirm: 'Yes, delete my account'
    };
    return translations[key] ?? key;
  })
}));

const menus = [
  {
    nameKey: 'delete_account',
    link: '/remove-account',
    icon: 'trash2' as const
  },
  { nameKey: 'log_out', link: '/logout', icon: 'logout' as const }
];

describe('ProfileActions', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders all menu items by name', () => {
    render(<ProfileActions menus={menus} />);
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('does NOT render <img> elements (no SVG assets)', () => {
    const { container } = render(<ProfileActions menus={menus} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders SVG icons from lucide-react', () => {
    const { container } = render(<ProfileActions menus={menus} />);
    // 2 menu items × (1 icon + 1 chevron) = at least 4 SVGs
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(4);
  });

  it.each([{ name: 'Log out' }, { name: 'Delete Account' }])(
    'opens confirmation drawer when $name is clicked',
    async ({ name }) => {
      const user = userEvent.setup();
      render(<ProfileActions menus={menus} />);

      const menuItem = screen.getByText(name);
      await user.click(menuItem);

      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    }
  );

  describe('confirm action navigation', () => {
    it.each([
      {
        name: 'Log out',
        expectedPath: '/logout',
        expectedBtn: 'Yes, log me out'
      },
      {
        name: 'Delete Account',
        expectedPath: '/remove-account',
        expectedBtn: 'Yes, delete my account'
      }
    ])(
      'routes to $expectedPath and shows "$expectedBtn" button when $name confirm is clicked',
      async ({ name, expectedPath, expectedBtn }) => {
        const user = userEvent.setup();
        render(<ProfileActions menus={menus} />);

        await user.click(screen.getByText(name));
        expect(screen.getByText(expectedBtn)).toBeInTheDocument();

        await user.click(screen.getByText(expectedBtn));
        expect(mockPush).toHaveBeenCalledWith(expectedPath);
      }
    );
  });
});
