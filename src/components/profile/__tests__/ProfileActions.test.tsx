import ProfileActions from '@/components/profile/ProfileActions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

const menus = [
  { name: 'Delete Account', link: '/remove-account', icon: 'trash2' as const },
  { name: 'Log out', link: '/logout', icon: 'logout' as const }
];

describe('ProfileActions', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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

      expect(screen.getByText(/Apakah Anda Yakin/i)).toBeInTheDocument();
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
