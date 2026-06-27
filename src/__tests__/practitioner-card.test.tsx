/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-empty-function, sonarjs/slow-regex */

import { PractitionerCard } from '@/components/practitioner/practitioner-card';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  // Polyfill ResizeObserver for JSDOM
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/components/general/avatar', () => ({
  default: (props: any) => <div data-testid='mock-avatar'>{props.initials}</div>
}));

describe('PractitionerCard', () => {
  it('renders name, specialty pills, and healthcare service', () => {
    render(
      <PractitionerCard
        id='prac-1'
        practitionerName='John Doe'
        photoUrl={undefined}
        specialties={['Cardiology', 'Internal Medicine']}
        healthcareServiceNames={['General Consultation', 'Follow-up Visit']}
        practitionerRoleId='role-1'
      />
    );

    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Cardiology')).toBeDefined();
    expect(screen.getByText('Internal Medicine')).toBeDefined();
    expect(
      screen.getByText('General Consultation; Follow-up Visit')
    ).toBeDefined();
  });

  it('shows "No healthcare service registered" when services are empty', () => {
    render(
      <PractitionerCard
        id='prac-2'
        practitionerName='Jane Smith'
        photoUrl={undefined}
        specialties={['Cardiology']}
        healthcareServiceNames={[]}
        practitionerRoleId='role-2'
      />
    );

    expect(screen.getByText('No healthcare service registered')).toBeDefined();
  });

  it('links to practitioner detail page', () => {
    render(
      <PractitionerCard
        id='prac-3'
        practitionerName='Dr. Who'
        photoUrl={undefined}
        specialties={['Time Travel']}
        healthcareServiceNames={['TARDIS Maintenance']}
        practitionerRoleId='role-3'
      />
    );

    const link = screen.getByText('Dr. Who').closest('a');
    expect(link).toHaveAttribute(
      'href',
      '/practitioner?practitionerRoleId=role-3'
    );
  });

  it('renders avatar with initials', () => {
    render(
      <PractitionerCard
        id='prac-4'
        practitionerName='Alice'
        photoUrl={undefined}
        specialties={['General']}
        healthcareServiceNames={[]}
        practitionerRoleId='role-4'
      />
    );

    expect(screen.getByTestId('mock-avatar')).toBeDefined();
  });

  it('renders all items when they fit (JSDOM has infinite width)', () => {
    render(
      <PractitionerCard
        id='prac-5'
        practitionerName='Overflow Doctor'
        photoUrl={undefined}
        specialties={[
          'Cardiology',
          'Neurology',
          'Orthopedics',
          'Pediatrics',
          'Dermatology'
        ]}
        healthcareServiceNames={['Consultation']}
        practitionerRoleId='role-5'
      />
    );

    // JSDOM has infinite width, so all specialties should render
    expect(screen.getByText('Cardiology')).toBeDefined();
    expect(screen.getByText('Dermatology')).toBeDefined();
    // No overflow indicator when all fit
    expect(screen.queryByText(/\d+\+/)).toBeNull();
  });
});
