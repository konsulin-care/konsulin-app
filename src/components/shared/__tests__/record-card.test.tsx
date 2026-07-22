import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />
}));

vi.mock('@/utils/helper', () => ({
  customMarkdownComponents: {},
  formatTitle: (t: string) => t
}));

import type { IRecord } from '@/types/record';
import RecordCard from '../record-card';

function makeRecord(overrides: Partial<IRecord> = {}): IRecord {
  return {
    type: 'Observation',
    resourceType: 'Observation',
    id: 'obs-1',
    title: 'Test',
    result: 'test',
    lastUpdated: '2024-06-01T00:00:00Z',
    ...overrides
  };
}

describe('RecordCard icon mapping', () => {
  it('renders HeartPulse for QuestionnaireResponse (assessment)', () => {
    render(
      <RecordCard
        record={makeRecord({ type: 'QuestionnaireResponse', id: 'qr-1' })}
      />
    );
    expect(screen.getByTestId('icon-assessment')).toBeInTheDocument();
  });

  it('renders Microscope for Condition', () => {
    render(
      <RecordCard record={makeRecord({ type: 'Condition', id: 'cond-1' })} />
    );
    expect(screen.getByTestId('icon-condition')).toBeInTheDocument();
  });

  it('renders FileText for unknown record types', () => {
    render(
      <RecordCard record={makeRecord({ type: 'UnknownType', id: 'unk-1' })} />
    );
    expect(screen.getByTestId('icon-fallback')).toBeInTheDocument();
  });

  it('renders practitioner photo for PractitionerNote with photo at 40x40', () => {
    const practitionerProfile = {
      id: 'prac-1',
      resourceType: 'Practitioner',
      photo: [{ url: 'https://example.com/doc.jpg' }]
    };
    render(
      <RecordCard
        record={makeRecord({
          type: 'PractitionerNote',
          id: 'prac-note-1',
          practitionerId: 'prac-1',
          practitionerProfile: practitionerProfile as never
        })}
      />
    );
    const img = screen.getByAltText('practitioner');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/doc.jpg');
    expect(img).toHaveAttribute('width', '40');
    expect(img).toHaveAttribute('height', '40');
  });

  it('renders algorithmic avatar for PractitionerNote with profile but no photo', () => {
    const practitionerProfile = {
      id: 'prac-2',
      resourceType: 'Practitioner',
      name: [{ given: ['Jane'], family: 'Smith' }]
    };
    render(
      <RecordCard
        record={makeRecord({
          type: 'PractitionerNote',
          id: 'prac-note-2',
          practitionerId: 'prac-2',
          practitionerProfile: practitionerProfile as never
        })}
      />
    );
    // Should NOT show FileText icon when profile exists but no photo
    expect(screen.queryByTestId('icon-fallback')).not.toBeInTheDocument();
    // Should show the Avatar component with initials from name
    const img = screen.getByAltText('practitioner');
    expect(img).toBeInTheDocument();
    // Should use an SVG data URL (algorithmic avatar)
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    expect(img).toHaveAttribute('width', '40');
    expect(img).toHaveAttribute('height', '40');
  });

  it('renders FileText for PractitionerNote without profile', () => {
    render(
      <RecordCard
        record={makeRecord({
          type: 'PractitionerNote',
          id: 'prac-note-3',
          practitionerId: 'prac-1'
        })}
      />
    );
    expect(screen.getByTestId('icon-fallback')).toBeInTheDocument();
  });

  it('renders patient photo for PatientNote with photo at 40x40', () => {
    render(
      <RecordCard
        record={makeRecord({
          type: 'PatientNote',
          id: 'patient-note-1',
          patientProfile: {
            photo: [{ url: 'https://example.com/patient.jpg' }]
          } as never
        })}
      />
    );
    const imgs = screen.getAllByRole('img');
    const patientImg = imgs.find(
      img => img.getAttribute('src') === 'https://example.com/patient.jpg'
    );
    expect(patientImg).toBeInTheDocument();
    expect(patientImg).toHaveAttribute('width', '40');
    expect(patientImg).toHaveAttribute('height', '40');
  });
});

describe('RecordCard practitioner note title', () => {
  it('shows "Notes from" with practitioner display name when profile exists', () => {
    const practitionerProfile = {
      id: 'prac-1',
      resourceType: 'Practitioner',
      name: [
        {
          prefix: ['Dr.'],
          given: ['Jane'],
          family: 'Smith'
        }
      ]
    };
    render(
      <RecordCard
        record={makeRecord({
          type: 'PractitionerNote',
          id: 'prac-note-1',
          practitionerId: 'prac-1',
          practitionerProfile: practitionerProfile as never
        })}
      />
    );
    expect(screen.getByText('Notes from Dr. Jane Smith')).toBeInTheDocument();
  });

  it('falls back to "Notes from Practitioner" when profile is missing', () => {
    render(
      <RecordCard
        record={makeRecord({
          type: 'PractitionerNote',
          id: 'prac-note-2',
          practitionerId: 'prac-1'
        })}
      />
    );
    expect(screen.getByText('Notes from Practitioner')).toBeInTheDocument();
  });

  it('shows valueString as the card description', () => {
    render(
      <RecordCard
        record={makeRecord({
          type: 'PractitionerNote',
          id: 'prac-note-3',
          practitionerId: 'prac-1',
          result: 'Patient reports feeling better today.'
        })}
      />
    );
    expect(
      screen.getByText('Patient reports feeling better today.')
    ).toBeInTheDocument();
  });
});

describe('RecordCard title loading skeleton', () => {
  it('renders skeleton placeholder when titlesLoading is true for QuestionnaireResponse', () => {
    render(
      <RecordCard
        record={makeRecord({
          type: 'QuestionnaireResponse',
          id: 'qr-loading',
          title: 'Questionnaire/phq9'
        })}
        titlesLoading={true}
      />
    );
    // Skeleton div has animate-pulse class from shadcn/ui
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });
});
