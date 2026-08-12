import { fireEvent, render, screen } from '@testing-library/react';
import type { Patient } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useProfileSectionSave', () => ({
  useProfileSectionSave: vi.fn()
}));

import { useProfileSectionSave } from '../hooks/useProfileSectionSave';
import NameEditDrawer from '../name-edit-drawer';

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['Old'], family: 'Name' }]
};

describe('NameEditDrawer', () => {
  const onClose = vi.fn();
  const mockSaveSection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveSection.mockImplementation((params: { onSuccess?: () => void }) => {
      params.onSuccess?.();
    });
    vi.mocked(useProfileSectionSave).mockReturnValue({
      isSaving: false,
      saveSection: mockSaveSection
    });
  });

  const renderDrawer = (overrides?: { given?: string[]; family?: string }) => {
    return render(
      <NameEditDrawer
        open
        onClose={onClose}
        fhirId='pat-1'
        resourceType='Patient'
        given={overrides?.given ?? ['John', 'Magnificent']}
        family={overrides?.family ?? 'Doe'}
      />
    );
  };

  it('pre-fills given and family from the profile name', () => {
    renderDrawer();
    expect(screen.getByTestId('given-0')).toHaveValue('John');
    expect(screen.getByTestId('given-1')).toHaveValue('Magnificent');
    expect(screen.getByTestId('family-input')).toHaveValue('Doe');
  });

  it('adds and removes repeatable given name rows', () => {
    renderDrawer();
    fireEvent.click(screen.getByTestId('add-given'));
    expect(screen.getByTestId('given-2')).toBeDefined();

    fireEvent.click(screen.getByTestId('remove-given-2'));
    expect(screen.queryByTestId('given-2')).toBeNull();
    expect(screen.getByTestId('given-1')).toBeDefined();
  });

  it('saves a HumanName that round-trips all given names', () => {
    renderDrawer();
    fireEvent.click(screen.getByText('Save'));

    expect(mockSaveSection).toHaveBeenCalledWith(
      expect.objectContaining({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        syncIdentity: true
      })
    );

    const params = mockSaveSection.mock.calls[0][0] as {
      merge: (latest: Patient) => Patient;
    };
    const merged = params.merge(patientFixture);
    expect(merged.name).toEqual([
      { use: 'official', given: ['John', 'Magnificent'], family: 'Doe' }
    ]);
  });

  it('closes the drawer after a successful save', () => {
    renderDrawer();
    fireEvent.click(screen.getByText('Save'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not save when all name parts are empty', () => {
    renderDrawer({ given: [], family: '' });
    fireEvent.click(screen.getByText('Save'));
    expect(mockSaveSection).not.toHaveBeenCalled();
  });
});
