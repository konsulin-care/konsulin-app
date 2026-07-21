import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactElement; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

vi.mock('@/components/shared/record-card', () => ({
  default: ({ record }: { record: { type: string } }) => (
    <div data-testid='record-card'>{record.type}</div>
  )
}));

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: vi.fn(() => ({ current: null }))
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/usePatientRecords', () => ({
  usePatientRecords: vi.fn()
}));

vi.mock('@/hooks/usePractitionerRecords', () => ({
  usePractitionerRecords: vi.fn()
}));

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header'>Header</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { usePatientRecords } from '@/hooks/usePatientRecords';
import { usePractitionerRecords } from '@/hooks/usePractitionerRecords';
import type { IRecord } from '@/types/record';
import RecordTimeline from '../record-timeline';

function makeRecord(overrides: Partial<IRecord> = {}): IRecord {
  return {
    type: 'Observation',
    resourceType: 'Observation',
    id: 'obs-1',
    title: 'Test',
    result: 'test',
    lastUpdated: '2024-06-01T00:00:00Z',
    ...overrides
  };
}

describe('RecordTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePatientRecords).mockReturnValue({
      records: [] as IRecord[],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    });

    vi.mocked(usePractitionerRecords).mockReturnValue({
      records: [] as IRecord[],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    });
  });

  it('calls usePatientRecords when user role is Patient', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Patient' } },
      isLoading: false
    });

    render(<RecordTimeline patientId='pat-1' />);

    expect(usePatientRecords).toHaveBeenCalledWith('pat-1');
    expect(usePractitionerRecords).toHaveBeenCalledWith(null);
  });

  it('calls usePractitionerRecords when user role is Practitioner', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Practitioner' } },
      isLoading: false
    });

    render(<RecordTimeline patientId='pat-1' />);

    expect(usePractitionerRecords).toHaveBeenCalledWith('pat-1');
    expect(usePatientRecords).toHaveBeenCalledWith(null);
  });

  it('shows loading skeleton when isLoading is true', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Patient' } },
      isLoading: false
    });

    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: true
    });

    render(<RecordTimeline patientId='pat-1' />);
    const skeleton = screen.getByTestId('timeline-skeleton');
    expect(skeleton).toBeInTheDocument();
    // Overlay div wraps the skeleton content
    expect(
      skeleton.querySelector('[data-testid="timeline-overlay"]')
    ).toBeInTheDocument();
  });

  it('shows empty state when no records', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Patient' } },
      isLoading: false
    });

    render(<RecordTimeline patientId='pat-1' />);

    expect(screen.getByText(/no records/i)).toBeInTheDocument();
    expect(screen.getByTestId('timeline-overlay')).toBeInTheDocument();
  });

  it('renders records from the hook', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Patient' } },
      isLoading: false
    });

    vi.mocked(usePatientRecords).mockReturnValue({
      records: [
        makeRecord({ id: 'obs-1', type: 'PatientNote' }),
        makeRecord({ id: 'qr-1', type: 'QuestionnaireResponse' })
      ],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    });

    render(<RecordTimeline patientId='pat-1' />);

    const cards = screen.getAllByTestId('record-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByTestId('timeline-overlay')).toBeInTheDocument();
  });

  it('shows category filter pills for available types', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Patient' } },
      isLoading: false
    });

    vi.mocked(usePatientRecords).mockReturnValue({
      records: [
        makeRecord({ id: 'obs-1', type: 'PatientNote' }),
        makeRecord({ id: 'qr-1', type: 'QuestionnaireResponse' })
      ],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    });

    render(<RecordTimeline patientId='pat-1' />);

    expect(screen.getByText(/journal/i)).toBeInTheDocument();
    expect(screen.getByText(/assessment/i)).toBeInTheDocument();
  });

  it('filters records when a category pill is clicked', async () => {
    const user = userEvent.setup();

    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Patient' } },
      isLoading: false
    });

    vi.mocked(usePatientRecords).mockReturnValue({
      records: [
        makeRecord({ id: 'obs-1', type: 'PatientNote' }),
        makeRecord({ id: 'qr-1', type: 'QuestionnaireResponse' })
      ],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    });

    render(<RecordTimeline patientId='pat-1' />);

    const assessmentButton = screen.getByText(/assessment/i);
    await user.click(assessmentButton);

    const cards = screen.getAllByTestId('record-card');
    expect(cards).toHaveLength(1);
    // Clicking "Assessment" hides QuestionnaireResponse, leaving PatientNote
    expect(cards[0].textContent).toBe('PatientNote');
  });

  it('wraps content in a padded container inside the overlay (matching clinic page)', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { userInfo: { role_name: 'Patient' } },
      isLoading: false
    });

    vi.mocked(usePatientRecords).mockReturnValue({
      records: [makeRecord({ id: 'obs-1', type: 'Observation' })],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    });

    render(<RecordTimeline patientId='pat-1' />);

    const overlay = screen.getByTestId('timeline-overlay');
    const searchInput = screen.getByPlaceholderText('Search records');

    // The search row (parent of the input) should NOT be a direct child
    // of the overlay — there should be a content wrapper div between them,
    // matching the clinic page's div.w-full.p-4 pattern.
    const searchRow = searchInput.parentElement;
    expect(searchRow.parentElement).not.toBe(overlay);
    expect(overlay.contains(searchRow)).toBe(true);
  });
});
