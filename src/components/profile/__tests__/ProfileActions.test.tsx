import ProfileActions from '@/components/profile/ProfileActions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

const menus = [
  { name: 'Delete Account', link: '/remove-account', icon: 'trash2' as const },
  { name: 'Log out', link: '/logout', icon: 'logout' as const }
];

describe('ProfileActions', () => {
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

      // Drawer title should be visible
      expect(screen.getByText(/Apakah Anda Yakin/i)).toBeInTheDocument();
    }
  );
});
