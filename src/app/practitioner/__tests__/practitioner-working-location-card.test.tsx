import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PractitionerWorkingLocationCard from '../practitioner-working-location-card';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('PractitionerWorkingLocationCard', () => {
  const defaultProps = {
    locationName: 'Klinik Utama Jakarta',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    healthcareServiceNames: ['General Checkup', 'Counselling'],
    practitionerRoleId: 'role-123'
  };

  it('renders the location name', () => {
    render(<PractitionerWorkingLocationCard {...defaultProps} />);
    expect(screen.getByText('Klinik Utama Jakarta')).toBeInTheDocument();
  });

  it('renders all working day badges', () => {
    render(<PractitionerWorkingLocationCard {...defaultProps} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  it('renders healthcare service names', () => {
    render(<PractitionerWorkingLocationCard {...defaultProps} />);
    expect(
      screen.getByText('General Checkup, Counselling')
    ).toBeInTheDocument();
  });

  it('navigates to availability on click', () => {
    render(<PractitionerWorkingLocationCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      '/practitioner/availability?id=role-123'
    );
  });

  it('renders with single healthcare service', () => {
    render(
      <PractitionerWorkingLocationCard
        {...defaultProps}
        healthcareServiceNames={['Checkup']}
      />
    );
    expect(screen.getByText('Checkup')).toBeInTheDocument();
  });

  it('renders with empty healthcare services gracefully', () => {
    render(
      <PractitionerWorkingLocationCard
        {...defaultProps}
        healthcareServiceNames={[]}
      />
    );
    expect(
      screen.getByText(/No healthcare service/i)
    ).toBeInTheDocument();
  });
});
