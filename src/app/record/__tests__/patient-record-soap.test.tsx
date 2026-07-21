/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/record', () => ({
  useGetSingleRecord: vi.fn()
}));

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn()
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner'>Loading</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { useGetSingleRecord } from '@/services/api/record';
import { getProfileById } from '@/services/profile';
import PatientRecordSoap from '../patient-record-soap';

describe('PatientRecordSoap', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          fullname: 'John Doe',
          email: 'john@example.com',
          fhirId: 'pat-1'
        }
      },
      isLoading: false
    } as any);
  });

  it('shows Practitioner Note label instead of Plan Note', async () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        code: {
          coding: [
            {
              system: 'https://loinc.org',
              code: '67855-7',
              display: 'Outpatient Note'
            }
          ]
        },
        valueString: 'Patient reports feeling better.',
        performer: [{ reference: 'Practitioner/prac-1' }],
        meta: { lastUpdated: '2024-06-01T00:00:00Z' }
      },
      isLoading: false
    } as any);

    vi.mocked(getProfileById).mockResolvedValue({
      id: 'prac-1',
      resourceType: 'Practitioner',
      name: [{ prefix: ['Dr.'], given: ['Jane'], family: 'Smith' }]
    } as any);

    render(
      <PatientRecordSoap soapId='obs-1' onPractitionerNameChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Practitioner's Note")).toBeInTheDocument();
    });
  });

  it('renders practitioner note content from valueString', async () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        code: {
          coding: [
            {
              system: 'https://loinc.org',
              code: '67855-7',
              display: 'Outpatient Note'
            }
          ]
        },
        valueString: 'Patient reports feeling better today.',
        performer: [{ reference: 'Practitioner/prac-1' }],
        meta: { lastUpdated: '2024-06-01T00:00:00Z' }
      },
      isLoading: false
    } as any);

    vi.mocked(getProfileById).mockResolvedValue({
      id: 'prac-1',
      resourceType: 'Practitioner',
      name: [{ prefix: ['Dr.'], given: ['Jane'], family: 'Smith' }]
    } as any);

    render(
      <PatientRecordSoap soapId='obs-1' onPractitionerNameChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Patient reports feeling better today.')
      ).toBeInTheDocument();
    });
  });

  it('does not show the duplicate patient name card', async () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        code: {
          coding: [
            {
              system: 'https://loinc.org',
              code: '67855-7',
              display: 'Outpatient Note'
            }
          ]
        },
        valueString: 'Test note',
        performer: [{ reference: 'Practitioner/prac-1' }],
        meta: { lastUpdated: '2024-06-01T00:00:00Z' }
      },
      isLoading: false
    } as any);

    vi.mocked(getProfileById).mockResolvedValue({
      id: 'prac-1',
      resourceType: 'Practitioner',
      name: [{ prefix: ['Dr.'], given: ['Jane'], family: 'Smith' }]
    } as any);

    render(
      <PatientRecordSoap soapId='obs-1' onPractitionerNameChange={vi.fn()} />
    );

    await waitFor(() => {
      // Patient name from auth context should NOT appear in PatientRecordSoap
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      // The code.text card should not appear either
      expect(screen.queryByText('Outpatient Note')).not.toBeInTheDocument();
    });
  });

  it('calls onPractitionerNameChange with the practitioner display name', async () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        code: {
          coding: [
            {
              system: 'https://loinc.org',
              code: '67855-7',
              display: 'Outpatient Note'
            }
          ]
        },
        valueString: 'Test note',
        performer: [{ reference: 'Practitioner/prac-1' }],
        meta: { lastUpdated: '2024-06-01T00:00:00Z' }
      },
      isLoading: false
    } as any);

    vi.mocked(getProfileById).mockResolvedValue({
      id: 'prac-1',
      resourceType: 'Practitioner',
      name: [{ prefix: ['Dr.'], given: ['Jane'], family: 'Smith' }]
    } as any);

    const onNameChange = vi.fn();

    render(
      <PatientRecordSoap
        soapId='obs-1'
        onPractitionerNameChange={onNameChange}
      />
    );

    await waitFor(() => {
      expect(onNameChange).toHaveBeenCalledWith('Dr. Jane Smith');
    });
  });

  it('falls back to "Practitioner" when profile fetch fails', async () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        status: 'final',
        code: {
          coding: [
            {
              system: 'https://loinc.org',
              code: '67855-7',
              display: 'Outpatient Note'
            }
          ]
        },
        valueString: 'Test note',
        performer: [{ reference: 'Practitioner/prac-1' }],
        meta: { lastUpdated: '2024-06-01T00:00:00Z' }
      },
      isLoading: false
    } as any);

    vi.mocked(getProfileById).mockRejectedValue(new Error('Profile not found'));

    const onNameChange = vi.fn();

    render(
      <PatientRecordSoap
        soapId='obs-1'
        onPractitionerNameChange={onNameChange}
      />
    );

    await waitFor(() => {
      expect(onNameChange).toHaveBeenCalledWith('Practitioner');
    });
  });

  it('shows loading spinner when soap data is loading', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: null,
      isLoading: true
    } as any);

    render(
      <PatientRecordSoap soapId='obs-1' onPractitionerNameChange={vi.fn()} />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
