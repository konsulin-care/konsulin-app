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

  it('renders practitioner photo for PractitionerNote with photo', () => {
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
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('renders FileText for PractitionerNote without photo', () => {
    render(
      <RecordCard
        record={makeRecord({
          type: 'PractitionerNote',
          id: 'prac-note-2',
          practitionerId: 'prac-1'
        })}
      />
    );
    expect(screen.getByTestId('icon-fallback')).toBeInTheDocument();
  });
});
