import { FabDirtyProvider, useFabDirty } from '@/context/fabDirtyContext';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuickActionFab from '../quick-action-fab';

// Mock dependencies
vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: { userInfo: { role_name: 'Patient' } }
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

function TestHarness() {
  const { setDirtyState } = useFabDirty();
  return (
    <div>
      <QuickActionFab />
      <button
        data-testid='trigger-dirty'
        onClick={() =>
          setDirtyState({
            isDirty: true,
            label: 'Save Changes',
            onSave: vi.fn(),
            isSaving: false
          })
        }
      >
        Make Dirty
      </button>
      <button data-testid='trigger-clean' onClick={() => setDirtyState(null)}>
        Make Clean
      </button>
    </div>
  );
}

/** Get the FAB toggle button (last button in the container, the round one). */
function getFabButton(container: HTMLElement): HTMLButtonElement | undefined {
  const buttons = container.querySelectorAll<HTMLButtonElement>(
    'button[class*="rounded-full"]'
  );
  const last = buttons.length - 1;
  return buttons[last] || undefined;
}

describe('QuickActionFab morphing', () => {
  it('renders as a circle with plus icon by default', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('h-14');
    expect(fabButton.className).toContain('w-14');

    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeTruthy();
  });

  it('morphs to pill with Save Changes text when dirty', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    fireEvent.click(screen.getByTestId('trigger-dirty'));

    const fabButton = getFabButton(container);
    expect(fabButton.textContent).toContain('Save Changes');

    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeFalsy();
  });

  it('reverts to circle after dirty state is cleared', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    fireEvent.click(screen.getByTestId('trigger-dirty'));
    expect(getFabButton(container).textContent).toContain('Save Changes');

    fireEvent.click(screen.getByTestId('trigger-clean'));

    const fabButton = getFabButton(container);
    expect(fabButton.className).toContain('h-14');
    expect(fabButton.className).toContain('w-14');

    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeTruthy();
  });

  it('hides pills menu when dirty', () => {
    const { container } = render(
      <FabDirtyProvider>
        <TestHarness />
      </FabDirtyProvider>
    );

    const fabButton = getFabButton(container);
    fireEvent.click(fabButton);

    const pills = screen.queryAllByText(
      /Self Checkup|Write Journal|View Schedule|Get Recommendation/
    );
    expect(pills.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('trigger-dirty'));

    const pillsAfter = screen.queryAllByText(
      /Self Checkup|Write Journal|View Schedule|Get Recommendation/
    );
    expect(pillsAfter.length).toBe(0);
  });
});
