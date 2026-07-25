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

vi.mock('@/context/fabDirtyContext', () => ({
  useFabDirty: vi.fn()
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
import { useFabDirty } from '@/context/fabDirtyContext';
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

    vi.mocked(useFabDirty).mockReturnValue({
      setDirtyState: mockSetDirtyState
    } as any);

    mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useSubmitJournal).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false
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

  it('sets dirtyState to null when title is less than 3 characters', () => {
    render(<CreateJournal />);

    const titleInput = screen.getByPlaceholderText('Journal Title');
    fireEvent.change(titleInput, { target: { value: 'ab' } });

    // Wait for React state updates
    const lastCall = mockSetDirtyState.mock.calls.at(-1);
    expect(lastCall[0]).toBeNull();
  });

  it('sets dirtyState to null when content has fewer than 2 words', () => {
    render(<CreateJournal />);

    // Title meets threshold but content has only 1 word
    const titleInput = screen.getByPlaceholderText('Journal Title');
    fireEvent.change(titleInput, { target: { value: 'My Day' } });

    const contentInput = screen.getByTestId('response-0');
    fireEvent.change(contentInput, { target: { value: 'oneword' } });

    const lastCall = mockSetDirtyState.mock.calls.at(-1);
    expect(lastCall[0]).toBeNull();
  });

  it('sets dirtyState with SaveJournal shape when title ≥3 chars AND content ≥2 words', () => {
    render(<CreateJournal />);

    const titleInput = screen.getByPlaceholderText('Journal Title');
    fireEvent.change(titleInput, { target: { value: 'My Day' } });

    const contentInput = screen.getByTestId('response-0');
    fireEvent.change(contentInput, { target: { value: 'two words' } });

    const dirtyCalls = mockSetDirtyState.mock.calls.filter(
      (c: unknown[]) => c[0] !== null
    );
    expect(dirtyCalls.length).toBeGreaterThanOrEqual(1);
    const latest = dirtyCalls.at(-1)[0] as {
      isDirty: boolean;
      label: string;
      onSave: () => void | Promise<void>;
      isSaving: boolean;
    };
    expect(latest.isDirty).toBe(true);
    expect(latest.label).toBe('Save Journal');
    expect(typeof latest.onSave).toBe('function');
    expect(latest.isSaving).toBe(false);
  });

  it('sets dirtyState to null when title and responses are empty', () => {
    render(<CreateJournal />);

    const lastCall = mockSetDirtyState.mock.calls.at(-1);
    expect(lastCall[0]).toBeNull();
  });

  it('calls submitJournal when onSave is triggered with valid content', async () => {
    render(<CreateJournal />);

    // Type both title and content to meet thresholds
    const titleInput = screen.getByPlaceholderText('Journal Title');
    fireEvent.change(titleInput, { target: { value: 'My Day' } });

    const contentInput = screen.getByTestId('response-0');
    fireEvent.change(contentInput, { target: { value: 'two words' } });

    // Find the latest setDirtyState call that is not null
    const dirtyCalls = mockSetDirtyState.mock.calls.filter(
      (c: unknown[]) => c[0] !== null
    );
    const onSave = (dirtyCalls.at(-1)[0] as { onSave: () => Promise<void> })
      .onSave;

    await onSave();

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

  it('cleans up dirty state on unmount', () => {
    const { unmount } = render(<CreateJournal />);
    unmount();

    const cleanupCall = mockSetDirtyState.mock.calls.find(
      (c: unknown[]) => c[0] === null
    );
    expect(cleanupCall).toBeDefined();
  });
});
