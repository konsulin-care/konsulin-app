import type { MergedAppointment } from '@/types/appointment';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/general/avatar', () => ({
  default: () => <div data-testid='mock-avatar' />
}));

vi.mock('@/components/page-header', () => ({
  default: () => null
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/hooks/useAppointments', () => ({
  useAppointments: vi.fn()
}));

vi.mock('@/components/shared/hooks/useScheduleFilter', () => ({
  useScheduleFilter: vi.fn()
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value
}));

vi.mock('@/components/shared/schedule-page-shell', () => ({
  default: () => null
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
}));

import { AppointmentCard } from '../patient-schedule';

const baseAppointment: MergedAppointment = {
  appointmentId: 'appt-1',
  slotStart: '2026-07-15T10:00:00+07:00',
  slotEnd: '2026-07-15T10:30:00+07:00',
  slotStatus: 'busy-tentative',
  appointmentStatus: 'booked',
  appointmentType: 'Online',
  practitionerId: 'prac-1',
  practitionerName: [{ given: ['John'], family: 'Doe' }],
  practitionerQualification: [],
  practitionerPhoto: [],
  practitionerEmail: 'john@clinic.com'
};

describe('AppointmentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Processing pill for pending appointments', () => {
    render(
      <AppointmentCard
        appointment={{ ...baseAppointment, appointmentStatus: 'pending' }}
      />
    );
    expect(screen.getByText('Processing')).toBeDefined();
  });

  it('renders the Processing pill for proposed appointments', () => {
    render(
      <AppointmentCard
        appointment={{ ...baseAppointment, appointmentStatus: 'proposed' }}
      />
    );
    expect(screen.getByText('Processing')).toBeDefined();
  });

  it('does not render the Processing pill for booked appointments', () => {
    render(<AppointmentCard appointment={baseAppointment} />);
    expect(screen.queryByText('Processing')).toBeNull();
  });

  it('renders Session fallback when appointment type is missing', () => {
    render(
      <AppointmentCard
        appointment={{ ...baseAppointment, appointmentType: '' }}
      />
    );
    expect(screen.getByText('Session')).toBeDefined();
  });
});
