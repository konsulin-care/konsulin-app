import { render, screen } from '@testing-library/react';
import type { Invoice } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/general/avatar', () => ({
  default: ({
    initials,
    photoUrl
  }: {
    initials?: string;
    photoUrl?: string;
  }) => (
    <div
      data-testid='mock-avatar'
      data-initials={initials}
      data-photo={photoUrl}
    >
      Avatar
    </div>
  )
}));

import AppointmentSummary from '../appointment-summary';

const baseProps = {
  practitionerName: 'Dr. John Doe',
  practitionerOrganizationName: 'Konsulin Clinic',
  healthcareServiceName: 'General Checkup',
  dateFormatted: '15 July 2026',
  timeFormatted: '10:00'
};

describe('AppointmentSummary', () => {
  it('renders practitioner name', () => {
    render(<AppointmentSummary {...baseProps} />);
    expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
  });

  it('renders healthcare service name', () => {
    render(<AppointmentSummary {...baseProps} />);
    expect(screen.getByText('General Checkup')).toBeInTheDocument();
  });

  it('defaults service name to Consultation', () => {
    const { healthcareServiceName: _omitted, ...props } = baseProps;
    render(<AppointmentSummary {...props} />);
    expect(screen.getByText('Consultation')).toBeInTheDocument();
  });

  it('renders date and time', () => {
    render(<AppointmentSummary {...baseProps} />);
    expect(screen.getByText('15 July 2026')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('renders location name', () => {
    render(<AppointmentSummary {...baseProps} />);
    expect(screen.getByText('Konsulin Clinic')).toBeInTheDocument();
  });

  it('passes avatar photo and initials through', () => {
    render(
      <AppointmentSummary
        {...baseProps}
        practitionerAvatar={{
          photoUrl: 'https://example.com/photo.jpg',
          initials: 'JD'
        }}
      />
    );
    const avatar = screen.getByTestId('mock-avatar');
    expect(avatar).toHaveAttribute(
      'data-photo',
      'https://example.com/photo.jpg'
    );
    expect(avatar).toHaveAttribute('data-initials', 'JD');
  });

  it('renders Total row with formatted currency when invoice has totalNet', () => {
    const invoice = {
      id: 'inv-1',
      totalNet: { value: 150_000, currency: 'IDR' }
    } as Invoice;
    render(<AppointmentSummary {...baseProps} invoice={invoice} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/150,000/)).toBeInTheDocument();
  });

  it('does not render Total row without an invoice', () => {
    render(<AppointmentSummary {...baseProps} />);
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });
});
