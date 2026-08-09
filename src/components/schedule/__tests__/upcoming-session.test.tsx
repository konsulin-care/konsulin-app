import { Roles } from '@/constants/roles';
import type { MergedAppointment, MergedSession } from '@/types/appointment';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UpcomingSession from '../upcoming-session';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: Record<string, string>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  )
}));

vi.mock('@/utils/gradientAvatar', () => ({
  generateAvatarSvgDataUrl: vi.fn(() => 'data:image/svg+xml;base64,test')
}));

const baseAppointment: MergedAppointment = {
  appointmentId: 'appt-1',
  slotStart: '2026-08-11T09:00:00',
  slotEnd: '2026-08-11T10:00:00',
  slotStatus: 'booked',
  appointmentType: 'Research Formulation Discussion',
  practitionerId: 'prac-1',
  practitionerName: [{ given: ['Aly'], family: 'Lamuri' }],
  practitionerQualification: [{ code: { coding: [{ code: 'S.Psi' }] } }],
  practitionerPhoto: [{ url: 'https://example.com/avatar.jpg' }],
  practitionerEmail: 'aly@test.com'
};

describe('UpcomingSession card', () => {
  it('renders nothing when there is no session data', () => {
    const { container } = render(
      <UpcomingSession data={[]} role={Roles.Patient} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a stable testid and links to the patient schedule', () => {
    render(<UpcomingSession data={[baseAppointment]} role={Roles.Patient} />);
    const card = screen.getByTestId('upcoming-session-card');
    expect(card).toHaveAttribute('href', '/schedule?id=appt-1');
  });

  it('renders the practitioner photo avatar when available', () => {
    render(<UpcomingSession data={[baseAppointment]} role={Roles.Patient} />);
    expect(screen.getByAltText('practitioner')).toHaveAttribute(
      'src',
      'https://example.com/avatar.jpg'
    );
  });

  it('falls back to a generated initials avatar without a photo', () => {
    const appointment: MergedAppointment = {
      ...baseAppointment,
      practitionerPhoto: []
    };
    render(<UpcomingSession data={[appointment]} role={Roles.Patient} />);
    const avatar = screen.getByAltText('practitioner');
    expect(avatar.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('renders the name with qualification', () => {
    render(<UpcomingSession data={[baseAppointment]} role={Roles.Patient} />);
    expect(screen.getByText('Aly Lamuri, S.Psi')).toBeDefined();
  });

  it('renders the appointment type with a Session suffix', () => {
    render(<UpcomingSession data={[baseAppointment]} role={Roles.Patient} />);
    expect(
      screen.getByText('Research Formulation Discussion Session')
    ).toBeDefined();
  });

  it('does not render a type line when appointment type is missing', () => {
    const appointment: MergedAppointment = {
      ...baseAppointment,
      appointmentType: null
    };
    render(<UpcomingSession data={[appointment]} role={Roles.Patient} />);
    expect(screen.queryByText(/ Session$/)).toBeNull();
  });

  it('renders the day-name date above the start-end time range', () => {
    render(<UpcomingSession data={[baseAppointment]} role={Roles.Patient} />);
    expect(screen.getByText('Tue, 11 Aug')).toBeDefined();
    expect(screen.getByText('09:00–10:00')).toBeDefined();
  });

  it('falls back to the start time only when the end is missing', () => {
    const appointment: MergedAppointment = {
      ...baseAppointment,
      slotEnd: null
    };
    render(<UpcomingSession data={[appointment]} role={Roles.Patient} />);
    expect(screen.getByText('09:00')).toBeDefined();
    expect(screen.queryByText('09:00–10:00')).toBeNull();
  });

  it('drops the legacy label and dd/MM/yyyy date', () => {
    render(<UpcomingSession data={[baseAppointment]} role={Roles.Patient} />);
    expect(screen.queryByText('Upcoming Session With')).toBeNull();
    expect(screen.queryByText('11/08/2026')).toBeNull();
  });

  it('renders the patient side for practitioners linking to the record', () => {
    const session: MergedSession = {
      appointmentId: 'appt-2',
      slotStart: '2026-08-11T09:00:00',
      slotEnd: '2026-08-11T10:00:00',
      slotStatus: 'booked',
      appointmentType: 'Follow-up',
      patientId: 'pat-9',
      patientName: [{ given: ['John'], family: 'Doe' }],
      patientPhoto: [{ url: 'https://example.com/patient.jpg' }],
      patientEmail: 'john@test.com'
    };
    render(<UpcomingSession data={[session]} role={Roles.Practitioner} />);
    const card = screen.getByTestId('upcoming-session-card');
    expect(card).toHaveAttribute('href', '/record?patientId=pat-9');
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByAltText('practitioner')).toHaveAttribute(
      'src',
      'https://example.com/patient.jpg'
    );
  });
});
