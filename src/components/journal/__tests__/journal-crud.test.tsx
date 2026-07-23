/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── CreateJournal mock setup ──

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/record', () => ({
  useSubmitJournal: vi.fn(),
  useDeleteJournal: vi.fn()
}));

vi.mock('@/components/shared/journal-response-fields', () => ({
  default: ({
    response,
    onAdd
  }: {
    readonly response: { readonly id: number; readonly text: string }[];
    readonly onAdd: () => void;
  }) => (
    <div data-testid='response-fields'>
      <span data-testid='response-count'>{response.length}</span>
      {response.map((item, index) => (
        <div key={item.id}>
          <textarea
            data-testid={`response-${String(index)}`}
            value={item.text}
            onChange={() => {
              /* noop */
            }}
          />
        </div>
      ))}
      <button data-testid='add-thought' onClick={onAdd} type='button'>
        Add New Thought
      </button>
    </div>
  )
}));

vi.mock('@/components/shared/journal-submit-button', () => ({
  default: ({
    onClick
  }: {
    readonly onClick: () => void;
    readonly isLoading?: boolean;
  }) => (
    <button data-testid='submit-button' onClick={onClick} type='button'>
      Submit
    </button>
  )
}));

vi.mock('@/components/shared/journal-succes-drawer', () => ({
  default: () => <div data-testid='success-drawer' />
}));

vi.mock('@/components/journal/calender-journal', () => ({
  default: () => <div data-testid='calendar' />
}));

import { useAuth } from '@/context/auth/authContext';
import { useDeleteJournal, useSubmitJournal } from '@/services/api/record';
import CreateJournal from '../create';

describe('CreateJournal - textarea behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { fhirId: 'patient-1' } },
      isLoading: false
    } as any);

    vi.mocked(useSubmitJournal).mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false
    } as any);
  });

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
});

// ── useDeleteJournal test ──

import { getAPI } from '@/services/api';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

describe('useDeleteJournal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls DELETE /fhir/Observation/{id} on mutation', async () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    vi.mocked(getAPI).mockResolvedValue({
      delete: mockDelete
    } as any);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const { result } = renderHook(() => useDeleteJournal(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    });

    result.current.mutate('journal-123');

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/fhir/Observation/journal-123');
    });
  });
});
