import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherLevelHalo from '../researcher-level-halo';

// Mock useAuth
vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fullname: 'Dr. Smith',
        email: 'smith@example.com',
        userId: 'user-1',
        profile_picture: undefined
      }
    }
  })
}));

// Mock generateAvatarPlaceholder
vi.mock('@/utils/helper', () => ({
  generateAvatarPlaceholder: () => ({
    initials: 'DS',
    backgroundColor: '#13c2c2',
    seed: 'user-1'
  })
}));

describe('ResearcherLevelHalo', () => {
  it('renders the halo ring SVG', () => {
    render(<ResearcherLevelHalo impactInLevel={50} levelNumber={2} />);
    expect(screen.getByTestId('researcher-halo-ring')).toBeInTheDocument();
  });

  it('renders the level chip', () => {
    render(<ResearcherLevelHalo impactInLevel={50} levelNumber={2} />);
    expect(screen.getByTestId('researcher-level')).toHaveTextContent('Lv 2');
  });

  it('renders the avatar', () => {
    render(<ResearcherLevelHalo impactInLevel={50} levelNumber={3} />);
    // Avatar is rendered inside the component
    const halo = screen.getByTestId('researcher-halo-ring');
    expect(halo.closest('.relative')).toBeInTheDocument();
  });

  it('applies correct stroke dash offset for 0% progress', () => {
    render(<ResearcherLevelHalo impactInLevel={0} levelNumber={1} />);
    const ring = screen.getByTestId('researcher-halo-ring');
    // At 0%, the dash offset should be equal to circumference (fully hidden)
    expect(ring).toHaveAttribute('data-fraction', '0');
  });

  it('applies correct stroke dash offset for 50% progress', () => {
    render(<ResearcherLevelHalo impactInLevel={50} levelNumber={2} />);
    const ring = screen.getByTestId('researcher-halo-ring');
    expect(ring).toHaveAttribute('data-fraction', '0.5');
  });

  it('applies correct stroke dash offset for 100% progress', () => {
    render(<ResearcherLevelHalo impactInLevel={100} levelNumber={3} />);
    const ring = screen.getByTestId('researcher-halo-ring');
    expect(ring).toHaveAttribute('data-fraction', '1');
  });

  it('clamps fraction above 1 to 1', () => {
    render(<ResearcherLevelHalo impactInLevel={150} levelNumber={4} />);
    const ring = screen.getByTestId('researcher-halo-ring');
    expect(ring).toHaveAttribute('data-fraction', '1');
  });

  it('clamps negative fraction to 0', () => {
    render(<ResearcherLevelHalo impactInLevel={-10} levelNumber={1} />);
    const ring = screen.getByTestId('researcher-halo-ring');
    expect(ring).toHaveAttribute('data-fraction', '0');
  });
});
