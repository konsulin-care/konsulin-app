import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock SessionAuth to simulate different auth states.
// Each test overrides this via mockImplementation.
vi.mock('supertokens-auth-react/recipe/session', () => ({
  SessionAuth: vi.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid='session-auth'>{children}</div>
  ))
}));

vi.mock('supertokens-auth-react/recipe/session/prebuiltui', () => ({
  AccessDeniedScreen: () => <div data-testid='access-denied'>Access Denied</div>
}));

vi.mock('supertokens-auth-react/recipe/userroles', () => ({
  UserRoleClaim: {
    validators: {
      includes: (role: string) => ({
        id: 'user-role',
        claim: { key: 'user-role' },
        shouldRefresh: () => false,
        validate: () => Promise.resolve({ isValid: role === 'Practitioner' })
      })
    }
  }
}));

import { SessionAuth } from 'supertokens-auth-react/recipe/session';
import { PractitionerRoute } from '../practitioner-route';

describe('PractitionerRoute', () => {
  it('renders children when session has Practitioner role', () => {
    vi.mocked(SessionAuth).mockImplementation(
      ({ children }: { children: React.ReactNode }) => (
        <div data-testid='session-auth'>{children}</div>
      )
    );

    render(
      <PractitionerRoute>
        <div data-testid='child-content'>Protected Content</div>
      </PractitionerRoute>
    );

    expect(screen.getByTestId('session-auth')).toBeDefined();
    expect(screen.getByTestId('child-content')).toBeDefined();
    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('renders access denied when session lacks Practitioner role', () => {
    vi.mocked(SessionAuth).mockImplementation(
      ({
        accessDeniedScreen: AccessDenied
      }: {
        accessDeniedScreen: React.ComponentType;
      }) => (
        <div data-testid='session-auth'>
          <AccessDenied />
        </div>
      )
    );

    render(
      <PractitionerRoute>
        <div data-testid='child-content'>Protected Content</div>
      </PractitionerRoute>
    );

    expect(screen.getByTestId('access-denied')).toBeDefined();
    expect(screen.queryByTestId('child-content')).toBeNull();
  });

  it('renders loading state while session is verifying', () => {
    vi.mocked(SessionAuth).mockImplementation(() => (
      <div data-testid='session-auth-loading'>Loading...</div>
    ));

    render(
      <PractitionerRoute>
        <div data-testid='child-content'>Protected Content</div>
      </PractitionerRoute>
    );

    expect(screen.getByText('Loading...')).toBeDefined();
    expect(screen.queryByTestId('child-content')).toBeNull();
  });
});
