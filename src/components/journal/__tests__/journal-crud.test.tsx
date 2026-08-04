/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── CreateJournal mock setup ──

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/record', () => ({
  useSubmitJournal: vi.fn()
}));

vi.mock('@/context/fabContext', () => ({
  useFab: vi.fn()
}));

vi.mock('@/components/shared/journal-response-fields', () => ({
  default: ({
    response,
    onAdd,
    onRemove,
    onResponseChange
  }: {
    readonly response: { readonly id: number; readonly text: string }[];
    readonly onAdd: () => void;
    readonly onRemove: (i: number) => void;
    readonly onResponseChange: (i: number, v: string) => void;
  }) => (
    <div data-testid='response-fields'>
      <span data-testid='response-count'>{response.length}</span>
      {response.map((item, index) => (
        <div key={item.id}>
          <textarea
            data-testid={`response-${String(index)}`}
            value={item.text}
            onChange={e => onResponseChange(index, e.target.value)}
          />
        </div>
      ))}
      <button data-testid='add-thought' onClick={onAdd} type='button'>
        Add New Thought
      </button>
      {response.length > 1 && (
        <button
          data-testid='remove-0'
          onClick={() => onRemove(0)}
          type='button'
        >
          Remove
        </button>
      )}
    </div>
  )
}));

vi.mock('@/components/shared/journal-succes-drawer', () => ({
  default: () => <div data-testid='success-drawer' />
}));

vi.mock('@/components/journal/calender-journal', () => ({
  default: () => <div data-testid='calendar' />
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    className
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
  }) => (
    <button
      data-testid={`button-${variant ?? 'default'}`}
      onClick={onClick}
      className={className}
      type='button'
    >
      {children}
    </button>
  ),
  buttonVariants: () => ''
}));

vi.mock('@/components/ui/skeleton', () => ({
  default: ({
    count,
    className
  }: {
    readonly count: number;
    readonly className: string;
  }) => (
    <div data-testid='skeleton' data-count={count} className={className}>
      Loading...
    </div>
  )
}));

import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useSubmitJournal } from '@/services/api/record';
import CreateJournal from '../create';

describe('CreateJournal', () => {
  let mockSetDirtyState: ReturnType<typeof vi.fn>;
  let mockMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSetDirtyState = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { fhirId: 'patient-1' } },
      isLoading: false
    } as any);

    vi.mocked(useFab).mockReturnValue({
      state: { action: null, selection: null, menu: null, panelOpen: false },
      dispatch: mockSetDirtyState
    } as any);

    mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useSubmitJournal).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false
    } as any);
  });

  // ── Task 1: textarea count ──

  it('renders exactly one textarea on mount', () => {
    render(<CreateJournal />);

    const responseCount = screen.getByTestId('response-count');
    expect(responseCount.textContent).toBe('1');
  });

  it('adds a textarea when "Add New Thought" is clicked', () => {
    render(<CreateJournal />);

    expect(screen.getByTestId('response-count').textContent).toBe('1');

    fireEvent.click(screen.getByTestId('add-thought'));

    expect(screen.getByTestId('response-count').textContent).toBe('2');
  });

  // ── Task 2: FAB dirty state (no submit button) ──

  it('does not render a submit button', () => {
    render(<CreateJournal />);

    // JournalSubmitButton was removed; no element with text 'Save Journal' as button content
    expect(screen.queryByText('Save Journal')).not.toBeInTheDocument();
    // Also no element with test id 'submit-button' from the old mock
    expect(screen.queryByTestId('submit-button')).not.toBeInTheDocument();
  });

  type FabDispatchCall = [
    action: {
      type: string;
      config: {
        label?: string;
        onAction?: () => void;
        isSaving?: boolean;
      } | null;
    }
  ];

  function lastCallIsNull() {
    const lastCall = mockSetDirtyState.mock.calls.at(-1) as
      | FabDispatchCall
      | undefined;
    return lastCall?.[0]?.type === 'SET_ACTION' && lastCall[0]?.config === null;
  }

  function getActionCalls() {
    return mockSetDirtyState.mock.calls.filter((c: unknown[]) => {
      const action = (c as FabDispatchCall)[0];
      return action?.type === 'SET_ACTION' && action?.config !== null;
    });
  }

  function getLastActionConfig() {
    const actionCalls = getActionCalls();
    return (actionCalls.at(-1)?.[0] as FabDispatchCall[0] | undefined)?.config;
  }

  it('sets action to null when title is less than 3 characters', () => {
    render(<CreateJournal />);

    const titleInput = screen.getByPlaceholderText('Journal Title');
    fireEvent.change(titleInput, { target: { value: 'ab' } });

    // Wait for React state updates
    expect(lastCallIsNull()).toBe(true);
  });

  it('sets action to null when content has fewer than 2 words', () => {
    render(<CreateJournal />);

    // Title meets threshold but content has only 1 word
    const titleInput = screen.getByPlaceholderText('Journal Title');
    fireEvent.change(titleInput, { target: { value: 'My Day' } });

    const contentInput = screen.getByTestId('response-0');
    fireEvent.change(contentInput, { target: { value: 'oneword' } });

    expect(lastCallIsNull()).toBe(true);
  });

  it('sets action with SaveJournal shape when title ≥3 chars AND content ≥2 words', () => {
    render(<CreateJournal />);

    const titleInput = screen.getByPlaceholderText('Journal Title');
    fireEvent.change(titleInput, { target: { value: 'My Day' } });

    const contentInput = screen.getByTestId('response-0');
    fireEvent.change(contentInput, { target: { value: 'two words' } });

    const config = getLastActionConfig();
    expect(config).toBeDefined();
    expect(config?.label).toBe('Save Journal');
    expect(typeof config?.onAction).toBe('function');
    expect(config?.isSaving).toBe(false);
  });

  it('sets action to null when title and responses are empty', () => {
    render(<CreateJournal />);

    expect(lastCallIsNull()).toBe(true);
  });

  it('calls submitJournal when onAction is triggered with valid content', () => {
    render(<CreateJournal />);

    // Type both title and content to meet thresholds
    const titleInput = screen.getByPlaceholderText('Journal Title');
    fireEvent.change(titleInput, { target: { value: 'My Day' } });

    const contentInput = screen.getByTestId('response-0');
    fireEvent.change(contentInput, { target: { value: 'two words' } });

    const config = getLastActionConfig();
    config?.onAction();

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    const payload = mockMutateAsync.mock.calls[0][0] as {
      valueString: string;
      resourceType: string;
      status: string;
      note: { text: string }[];
    };
    expect(payload.valueString).toBe('My Day');
    expect(payload.resourceType).toBe('Observation');
    expect(payload.status).toBe('final');
    expect(payload.note).toEqual([{ text: 'two words' }]);
  });

  it('cleans up action state on unmount', () => {
    const { unmount } = render(<CreateJournal />);
    unmount();

    const cleanupCall = mockSetDirtyState.mock.calls.find(
      (c: unknown[]) =>
        (c as FabDispatchCall)[0]?.type === 'SET_ACTION' &&
        (c as FabDispatchCall)[0]?.config === null
    );
    expect(cleanupCall).toBeDefined();
  });
});
