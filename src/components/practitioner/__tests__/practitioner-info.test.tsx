import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PractitionerInfo } from '../practitioner-info';

describe('PractitionerInfo', () => {
  it('renders practitioner name', () => {
    render(<PractitionerInfo practitionerName='Dr. John Doe' />);
    expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
  });

  it('renders organization name when provided', () => {
    render(
      <PractitionerInfo
        practitionerName='Dr. John Doe'
        practitionerOrganizationName='Konsulin Clinic'
      />
    );
    expect(screen.getByText('Konsulin Clinic')).toBeInTheDocument();
  });

  it('does not render organization name when not provided', () => {
    render(<PractitionerInfo practitionerName='Dr. John Doe' />);
    expect(screen.queryByText('Konsulin Clinic')).not.toBeInTheDocument();
  });

  it('renders avatar with initials', () => {
    render(
      <PractitionerInfo
        practitionerName='Dr. John Doe'
        practitionerAvatar={{ initials: 'JD', backgroundColor: '#000' }}
      />
    );
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
