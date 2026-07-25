/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock setup ──

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace }))
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/context/fabDirtyContext', () => ({
  useFabDirty: vi.fn(),
  FabDirtyProvider: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('@/services/api/record', () => ({
  useUpdateJournal: vi.fn(),
  useGetSingleRecord: vi.fn()
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

vi.mock('@/components/shared/journal-succes-drawer', () => ({
  default: (props: { viewRoute?: string }) => (
    <div data-testid='success-drawer' data-view-route={props.viewRoute ?? ''} />
  )
}));

import { useAuth } from '@/context/auth/authContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import { useGetSingleRecord, useUpdateJournal } from '@/services/api/record';
import EditJournal from '../edit';

const MOCK_JOURNAL_DATA = {
  valueString: 'My Journal Title',
  note: [{ text: 'First note content' }, { text: 'Second note content' }],
  effectiveDateTime: '2026-07-22T10:00:00Z',
  meta: { lastUpdated: '2026-07-22T10:30:00Z' },
  subject: { reference: 'Patient/original-owner' },
  performer: [{ reference: 'Patient/original-owner' }]
};

describe('EditJournal', () => {
  let mockSetDirtyState: ReturnType<typeof vi.fn>;
  let mockMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();

    mockSetDirtyState = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { fhirId: 'patient-1' } },
      isLoading: false
    } as any);

    vi.mocked(useFabDirty).mockReturnValue({
      setDirtyState: mockSetDirtyState
    } as any);

    mockMutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useUpdateJournal).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false
    } as any);

    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: MOCK_JOURNAL_DATA,
      isLoading: false
    } as any);
  });

  it('renders loading skeleton when journal data is loading', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: undefined,
      isLoading: true
    } as any);

    const { container } = render(<EditJournal journalId='obs-123' />);

    // Skeleton renders animated pulse divs
    const skeletonDivs = container.querySelectorAll('.animate-pulse');
    expect(skeletonDivs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders journal title and note fields when data loads', () => {
    render(<EditJournal journalId='obs-123' />);

    expect(screen.getByDisplayValue('My Journal Title')).toBeInTheDocument();
    expect(screen.getByTestId('response-count').textContent).toBe('2');
  });

  it('always sets dirty state with save button regardless of changes', () => {
    render(<EditJournal journalId='obs-123' />);

    // At least one call should set dirty state with Save Journal shape
    const dirtyCalls = mockSetDirtyState.mock.calls.filter(
      (c: unknown[]) => (c[0] as { label?: string })?.label === 'Save Journal'
    );
    expect(dirtyCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('calls router.replace without PUT when saving without changes', async () => {
    render(<EditJournal journalId='obs-123' />);

    // Extract the onSave callback from setDirtyState
    const onSave = mockSetDirtyState.mock.calls.at(-1)[0].onSave;
    await onSave();

    // Should redirect without calling PUT
    expect(mockReplace).toHaveBeenCalledWith(
      '/record?view=Observation/obs-123'
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('calls PUT mutation with stripped payload when saving with changes', async () => {
    render(<EditJournal journalId='obs-123' />);

    // Simulate a title change
    const titleInput = screen.getByDisplayValue('My Journal Title');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    // Extract onSave from the latest setDirtyState call
    const onSave = mockSetDirtyState.mock.calls.at(-1)[0].onSave;
    await onSave();

    // PUT should have been called
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);

    // Verify note objects do NOT contain `id`
    const payload = mockMutateAsync.mock.calls[0][0];
    expect(payload.note).toBeDefined();
    for (const note of payload.note) {
      expect(note).not.toHaveProperty('id');
      expect(note).toHaveProperty('text');
    }
  });

  it('passes viewRoute to success drawer when saving with changes', async () => {
    render(<EditJournal journalId='obs-123' />);

    // Simulate a title change
    const titleInput = screen.getByDisplayValue('My Journal Title');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    // Extract onSave from the latest setDirtyState call
    const onSave = mockSetDirtyState.mock.calls.at(-1)[0].onSave;
    await onSave();

    // Success drawer should receive viewRoute pointing to view page
    const drawer = screen.getByTestId('success-drawer');
    expect(drawer.dataset.viewRoute).toBe('/record?view=Observation/obs-123');
  });

  it('includes id, valueString, status in PUT payload', async () => {
    render(<EditJournal journalId='obs-123' />);

    const titleInput = screen.getByDisplayValue('My Journal Title');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    const onSave = mockSetDirtyState.mock.calls.at(-1)[0].onSave;
    await onSave();

    const payload = mockMutateAsync.mock.calls[0][0];
    expect(payload.id).toBe('obs-123');
    expect(payload.resourceType).toBe('Observation');
    expect(payload.status).toBe('amended');
    expect(payload.valueString).toBe('Updated Title');
  });

  it('preserves original subject/performer from journalData in payload', async () => {
    render(<EditJournal journalId='obs-123' />);

    const titleInput = screen.getByDisplayValue('My Journal Title');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    const onSave = mockSetDirtyState.mock.calls.at(-1)[0].onSave;
    await onSave();

    const payload = mockMutateAsync.mock.calls[0][0];
    expect(payload.subject).toEqual({ reference: 'Patient/original-owner' });
    expect(payload.performer).toEqual([
      { reference: 'Patient/original-owner' }
    ]);
  });
});
