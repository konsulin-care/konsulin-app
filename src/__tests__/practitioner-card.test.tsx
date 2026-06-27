/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-empty-function, sonarjs/slow-regex */

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

vi.mock('@/utils/gradientAvatar', () => ({
  generateAvatarSvgDataUrl: vi.fn(() => 'data:image/svg+xml;mock')
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

  it('renders avatar as a square container (no circle)', () => {
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

    // Avatar container should have aspect-square (square, not circle)
    const link = screen.getByText('Alice').closest('a');
    const avatarContainer = link?.querySelector('.aspect-square');
    expect(avatarContainer).not.toBeNull();
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

  it('renders card with items-stretch layout', () => {
    render(
      <PractitionerCard
        id='prac-6'
        practitionerName='Stretch Test'
        photoUrl={undefined}
        specialties={['General']}
        healthcareServiceNames={[]}
        practitionerRoleId='role-6'
      />
    );

    const link = screen.getByText('Stretch Test').closest('a');
    expect(link?.className).toContain('items-stretch');
  });

  it('has overflow-hidden on the card to clip avatar to rounded corners', () => {
    render(
      <PractitionerCard
        id='prac-7'
        practitionerName='Clip Test'
        photoUrl={undefined}
        specialties={['General']}
        healthcareServiceNames={[]}
        practitionerRoleId='role-7'
      />
    );

    const link = screen.getByText('Clip Test').closest('a');
    expect(link?.className).toContain('overflow-hidden');
  });
});
