import type { MergedSession } from '@/types/appointment';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SessionCard from '../session-card';

vi.mock('@/utils/gradientAvatar', () => ({
  generateAvatarSvgDataUrl: vi.fn(() => 'data:image/svg+xml;base64,test')
}));

const baseSession: MergedSession = {
  appointmentId: 'appt-1',
  slotStart: '2026-07-04T02:00:00.000Z',
  slotEnd: '2026-07-04T02:30:00.000Z',
  slotStatus: 'free',
  appointmentStatus: 'booked',
  appointmentType: 'follow-up',
  patientId: 'pat-1',
  patientName: [{ given: ['John'], family: 'Doe' }],
  patientPhoto: [],
  patientEmail: 'john@test.com'
};

describe('SessionCard', () => {
  it('renders patient name and time', () => {
    render(<SessionCard session={baseSession} />);
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('02:00 - 04/07/2026')).toBeDefined();
  });

  it('renders appointment type', () => {
    render(<SessionCard session={baseSession} />);
    expect(screen.getByText('Follow-up Session')).toBeDefined();
  });

  it('links to patient record', () => {
    render(<SessionCard session={baseSession} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/record?patientId=pat-1');
  });

  it('shows email when patient name is missing', () => {
    const session: MergedSession = {
      ...baseSession,
      patientName: [],
      patientEmail: 'jane@test.com'
    };
    render(<SessionCard session={session} />);
    expect(screen.getByText('jane@test.com')).toBeDefined();
  });

  it('applies location color as left border class', () => {
    const { container } = render(
      <SessionCard session={baseSession} locationColor='#F5222D' />
    );
    const link = container.querySelector('a');
    expect(link?.className).toContain('border-l-4');
  });

  it('renders location name when provided', () => {
    render(<SessionCard session={baseSession} locationName='Clinic A' />);
    expect(screen.getByText('Clinic A')).toBeDefined();
  });

  it('renders without location props', () => {
    const { container } = render(<SessionCard session={baseSession} />);
    const link = container.querySelector('a');
    expect(link).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('renders the Processing pill for pending appointments', () => {
    render(
      <SessionCard session={{ ...baseSession, appointmentStatus: 'pending' }} />
    );
    expect(screen.getByText('Processing')).toBeDefined();
  });

  it('renders the Processing pill for proposed appointments', () => {
    render(
      <SessionCard
        session={{ ...baseSession, appointmentStatus: 'proposed' }}
      />
    );
    expect(screen.getByText('Processing')).toBeDefined();
  });

  it('does not render the Processing pill for booked appointments', () => {
    render(<SessionCard session={baseSession} />);
    expect(screen.queryByText('Processing')).toBeNull();
  });

  it('renders Session fallback when appointment type is missing', () => {
    render(<SessionCard session={{ ...baseSession, appointmentType: '' }} />);
    expect(screen.getByText('Session')).toBeDefined();
  });
});
