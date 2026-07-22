/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush }))
}));

vi.mock('@/services/api/record', () => ({
  useGetSingleRecord: vi.fn()
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  )
}));

import { useGetSingleRecord } from '@/services/api/record';
import RecordJournal from '../record-journal';

describe('RecordJournal - edit navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to edit with id and category=4 on edit button click', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        code: {
          coding: [{ system: 'https://loinc.org', code: '51855-5' }]
        },
        valueString: 'Patient journal entry',
        effectiveDateTime: '2025-06-15T10:00:00Z',
        meta: { lastUpdated: '2025-06-16T10:00:00Z' },
        note: [{ text: 'Doctor note' }]
      },
      isLoading: false
    } as any);

    render(<RecordJournal journalId='journal-1' />);
    const editButton = screen.getByText('Edit Journal');
    fireEvent.click(editButton);

    expect(mockPush).toHaveBeenCalledWith(
      '/record/edit?id=journal-1&category=4'
    );
  });
});
