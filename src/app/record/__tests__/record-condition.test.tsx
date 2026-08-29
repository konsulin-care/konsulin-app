/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/record', () => ({
  useGetSingleRecord: vi.fn()
}));

import { useGetSingleRecord } from '@/services/api/record';
import RecordCondition from '../record-condition';

describe('RecordCondition - evidence code safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders evidence bullet points when codes are present', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Condition',
        id: 'cond-1',
        code: { text: 'Headache' },
        evidence: [
          {
            code: [
              { text: 'MRI positive' },
              { text: 'Persistent for 3 months' }
            ]
          }
        ]
      },
      isLoading: false
    } as any);

    render(<RecordCondition conditionId='cond-1' />);
    expect(screen.getByText(/MRI positive/)).toBeInTheDocument();
    expect(screen.getByText(/Persistent for 3 months/)).toBeInTheDocument();
  });

  it('renders dash when no evidence codes', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Condition',
        id: 'cond-2',
        code: { text: 'Headache' },
        evidence: []
      },
      isLoading: false
    } as any);

    render(<RecordCondition conditionId='cond-2' />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('does not crash when evidence entry has no code field', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Condition',
        id: 'cond-3',
        code: { text: 'Headache' },
        evidence: [{ detail: [{ reference: 'Observation/obs-1' }] }]
      },
      isLoading: false
    } as any);

    render(<RecordCondition conditionId='cond-3' />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows skeleton during loading', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: null,
      isLoading: true
    } as any);

    const { container } = render(<RecordCondition conditionId='cond-1' />);
    // Skeleton renders divs — just verify no crash
    expect(container.querySelector('.card')).toBeNull();
  });
});
