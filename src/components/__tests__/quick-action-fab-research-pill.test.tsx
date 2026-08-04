import { FabProvider } from '@/context/fabContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickActionFab from '../quick-action-fab';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});
let mockRole = 'Patient';
const pushMock = vi.fn();

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({ state: { userInfo: { role_name: mockRole } } })
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));
vi.mock('@/services/api', () => ({ getAPI: vi.fn() }));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

function renderFab() {
  return render(
    <FabProvider>
      <QueryClientProvider client={queryClient}>
        <QuickActionFab />
      </QueryClientProvider>
    </FabProvider>
  );
}

function getFabButton(container: HTMLElement): HTMLButtonElement | undefined {
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    'button[class*="rounded-full"]'
  );
  return buttons.item(buttons.length - 1) ?? undefined;
}

describe('QuickActionFab Join Research pill', () => {
  beforeEach(() => {
    mockRole = 'Patient';
    pushMock.mockReset();
  });

  it('renders for Patient role', () => {
    renderFab();
    fireEvent.click(getFabButton(renderFab().container));
    expect(screen.getByText('Join Research')).toBeDefined();
  });

  it('renders for Guest role', () => {
    mockRole = 'Guest';
    renderFab();
    fireEvent.click(getFabButton(renderFab().container));
    expect(screen.getByText('Join Research')).toBeDefined();
  });

  it('navigates to /research when clicked', () => {
    renderFab();
    fireEvent.click(getFabButton(renderFab().container));
    fireEvent.click(screen.getByText('Join Research'));
    expect(pushMock).toHaveBeenCalledWith('/research');
  });
});
