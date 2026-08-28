import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn()
}));

vi.mock('@/components/app-chrome', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='app-chrome'>{children}</div>
  )
}));

vi.mock('@/components/providers', () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='app-providers'>{children}</div>
  )
}));

vi.mock('@/components/admin/admin-shell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='admin-shell'>{children}</div>
  )
}));

import { RouteGate } from '@/components/route-gate';
import { usePathname } from 'next/navigation';

describe('RouteGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the admin shell for /admin paths', () => {
    vi.mocked(usePathname).mockReturnValue('/admin');
    render(
      <RouteGate>
        <span>content</span>
      </RouteGate>
    );
    expect(screen.getByTestId('admin-shell')).toBeDefined();
    expect(screen.queryByTestId('app-chrome')).toBeNull();
  });

  it('renders the normal app chrome for non-admin paths', () => {
    vi.mocked(usePathname).mockReturnValue('/profile');
    render(
      <RouteGate>
        <span>content</span>
      </RouteGate>
    );
    expect(screen.getByTestId('app-chrome')).toBeDefined();
    expect(screen.queryByTestId('admin-shell')).toBeNull();
  });

  it('keeps children in both branches', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    render(
      <RouteGate>
        <span data-testid='payload'>child</span>
      </RouteGate>
    );
    expect(screen.getByTestId('payload')).toBeDefined();
  });
});
