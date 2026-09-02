import { FhirSystems } from '@/utils/fhir/extensions';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import type { PractitionerRole } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SpecialtySection from '../specialty-section';

const mockMutateAsync = vi.fn();

/** onDirtyChange signature shared by the section tests. */
type DirtyHandler = (
  dirty: boolean,
  save: () => Promise<void>,
  saving: boolean
) => void;

vi.mock('@/services/clinicians', () => ({
  useUpdatePractitionerInfo: () => ({ mutateAsync: mockMutateAsync })
}));

// The real NUCC_TAXONOMY has 699 entries; opening the cmdk picker in jsdom
// does O(n²) mount work, which times out under parallel load. A 2-entry
// fixture keeps this component test fast; full-dataset coverage lives in
// src/utils/fhir/__tests__/specialty.test.ts.
vi.mock('@/data/nucc-taxonomy', () => ({
  NUCC_TAXONOMY: [
    {
      code: '103T00000X',
      grouping: 'Behavioral Health & Social Service Providers',
      classification: 'Psychologist',
      specialization: '',
      label: 'Psychologist'
    },
    {
      code: '2084P0800X',
      grouping: 'Allopathic & Osteopathic Physicians',
      classification: 'Psychiatry & Neurology',
      specialization: 'Psychiatry',
      label: 'Psychiatry Physician'
    }
  ]
}));

const NUCC_PSYCHOLOGIST = {
  coding: [
    {
      system: FhirSystems.nuccTaxonomy,
      code: '103T00000X',
      display: 'Psychologist'
    }
  ],
  text: 'Psychologist'
};

const EXTERNAL_SNOMED = {
  coding: [{ system: FhirSystems.snomedSct, code: '408443003' }],
  text: 'General medical practice'
};

function role(specialty?: PractitionerRole['specialty']): PractitionerRole {
  return {
    resourceType: 'PractitionerRole',
    id: 'pr-1',
    ...(specialty ? { specialty } : {})
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('SpecialtySection', () => {
  it('renders selected NUCC specialties as removable chips', () => {
    render(<SpecialtySection practitionerRole={role([NUCC_PSYCHOLOGIST])} />);

    // The trigger text and the chip both carry the label
    expect(screen.getAllByText('Psychologist').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Remove Psychologist')).toBeInTheDocument();
  });

  it('renders external non-NUCC specialties as read-only chips', () => {
    render(<SpecialtySection practitionerRole={role([EXTERNAL_SNOMED])} />);

    expect(screen.getByText('General medical practice')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Remove General medical practice')
    ).not.toBeInTheDocument();
  });

  it('adds a selected code as a chip and reports dirty', async () => {
    const onDirtyChange = vi.fn<DirtyHandler>();
    render(
      <SpecialtySection
        practitionerRole={role([NUCC_PSYCHOLOGIST])}
        onDirtyChange={onDirtyChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Psychiatry Physician')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Psychiatry Physician'));

    await waitFor(() => {
      expect(
        screen.getByLabelText('Remove Psychiatry Physician')
      ).toBeInTheDocument();
    });
    expect(onDirtyChange.mock.calls.some(call => call[0] === true)).toBe(true);
  }, 20_000);

  it('removes a chip and saves the merged payload', async () => {
    mockMutateAsync.mockResolvedValueOnce({});
    const onDirtyChange = vi.fn<DirtyHandler>();
    render(
      <SpecialtySection
        practitionerRole={role([NUCC_PSYCHOLOGIST])}
        onDirtyChange={onDirtyChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Remove Psychologist'));

    const dirtyCall = onDirtyChange.mock.calls.find(
      ([dirty]) => dirty === true
    );
    const save = dirtyCall?.[1];
    if (!save) throw new Error('expected a dirty call with a save handler');

    await act(async () => {
      await save();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pr-1', specialty: [] })
    );
  }, 20_000);

  it('keeps external specialties in the saved payload', async () => {
    mockMutateAsync.mockResolvedValueOnce({});
    const onDirtyChange = vi.fn<DirtyHandler>();
    render(
      <SpecialtySection
        practitionerRole={role([NUCC_PSYCHOLOGIST, EXTERNAL_SNOMED])}
        onDirtyChange={onDirtyChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Remove Psychologist'));

    const dirtyCall = onDirtyChange.mock.calls.find(
      ([dirty]) => dirty === true
    );
    const save = dirtyCall?.[1];
    if (!save) throw new Error('expected a dirty call with a save handler');

    await act(async () => {
      await save();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ specialty: [EXTERNAL_SNOMED] })
    );
  }, 20_000);
});
