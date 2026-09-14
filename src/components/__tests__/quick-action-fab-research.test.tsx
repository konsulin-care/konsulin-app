import { FabProvider, useFab } from '@/context/fabContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { ArrowRight, Check } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickActionFab from '../quick-action-fab';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: 'Researcher', fhirId: 'researcher-1' }
    }
  })
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: vi.fn().mockReturnValue({
    appointmentData: null,
    sessionData: null
  })
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/components/general/avatar', () => ({
  default: () => <div>Avatar</div>
}));

vi.mock('@/context/recommendationContext', () => ({
  useRecommendationResult: vi.fn().mockReturnValue({ setResult: vi.fn() })
}));

/** Helper: dispatches an action to the FAB context on mount. */
function ActionDispatcher({
  label,
  icon
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const { dispatch } = useFab();
  // Use setTimeout to dispatch after mount
  setTimeout(() => {
    dispatch({
      type: 'SET_ACTION',
      config: { label, icon, onAction: vi.fn() }
    });
  }, 0);
  return null;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <FabProvider>{children}</FabProvider>
    </QueryClientProvider>
  );
}

describe('QuickActionFab - research form pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/research/register');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
  });

  it('renders action button when action is dispatched', async () => {
    render(
      <>
        <ActionDispatcher label='Next' icon={ArrowRight} />
        <QuickActionFab />
      </>,
      { wrapper }
    );

    // Wait for the setTimeout to fire
    await screen.findByText('Next');
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('renders Submit action when dispatched', async () => {
    render(
      <>
        <ActionDispatcher label='Submit' icon={Check} />
        <QuickActionFab />
      </>,
      { wrapper }
    );

    await screen.findByText('Submit');
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });
});
