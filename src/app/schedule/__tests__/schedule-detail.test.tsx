import type { MergedAppointment } from '@/types/appointment';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/general/avatar', () => ({
  default: () => <div data-testid='mock-avatar' />
}));

vi.mock('@/components/general/empty-state', () => ({
  default: () => <div data-testid='mock-empty-state' />
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='mock-loading-spinner' />
}));

vi.mock('@/components/page-header', () => ({
  default: () => null
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (): string | null => 'appt-1' })
}));

const mockUseAppointment = vi.fn<
  (id: string) => {
    data: MergedAppointment | null;
    isLoading: boolean;
    isError: boolean;
  }
>();

vi.mock('@/services/hooks/useAppointment', () => ({
  useAppointment: (id: string) => mockUseAppointment(id)
}));

import ScheduleDetail from '../schedule-detail';

const pendingAppointment: MergedAppointment = {
  appointmentId: 'appt-1',
  slotStart: '2026-07-15T10:00:00+07:00',
  slotEnd: '2026-07-15T10:30:00+07:00',
  slotStatus: 'busy-tentative',
  appointmentStatus: 'pending',
  appointmentType: 'Online',
  practitionerId: 'prac-1',
  practitionerName: [{ given: ['John'], family: 'Doe' }],
  practitionerQualification: [],
  practitionerPhoto: [],
  practitionerEmail: 'john@clinic.com'
};

function renderDetail(data: MergedAppointment | null) {
  mockUseAppointment.mockReturnValue({
    data,
    isLoading: false,
    isError: false
  });
  render(<ScheduleDetail />);
}

describe('ScheduleDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Processing pill for pending appointments', () => {
    renderDetail(pendingAppointment);
    expect(screen.getByText('Processing')).toBeDefined();
  });

  it('renders the Processing pill for proposed appointments', () => {
    renderDetail({ ...pendingAppointment, appointmentStatus: 'proposed' });
    expect(screen.getByText('Processing')).toBeDefined();
  });

  it('does not render the Processing pill for booked appointments', () => {
    renderDetail({ ...pendingAppointment, appointmentStatus: 'booked' });
    expect(screen.queryByText('Processing')).toBeNull();
  });

  it('renders Session fallback when appointment type is missing', () => {
    renderDetail({ ...pendingAppointment, appointmentType: '' });
    expect(screen.getByText('Session')).toBeDefined();
  });
});
