/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner'>Loading</div>
}));

vi.mock('../patient-record-soap', () => ({
  default: ({
    onPractitionerNameChange
  }: {
    onPractitionerNameChange?: (name: string) => void;
  }) => (
    <div data-testid='mock-patient-record-soap'>
      {typeof onPractitionerNameChange === 'function'
        ? 'has-callback'
        : 'no-callback'}
    </div>
  )
}));

vi.mock('../practitioner-record-soap', () => ({
  default: () => <div data-testid='mock-practitioner-record-soap'>Prac</div>
}));

import { useAuth } from '@/context/auth/authContext';
import RecordSoap from '../record-soap';

describe('RecordSoap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes onPractitionerNameChange to PatientRecordSoap when patient role', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        userInfo: { role_name: 'Patient' }
      },
      isLoading: false
    } as any);

    const onNameChange = vi.fn();
    render(
      <RecordSoap soapId='obs-1' onPractitionerNameChange={onNameChange} />
    );

    expect(screen.getByTestId('mock-patient-record-soap')).toBeInTheDocument();
    expect(screen.getByTestId('mock-patient-record-soap').textContent).toBe(
      'has-callback'
    );
  });

  it('does not crash when onPractitionerNameChange is not passed', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        userInfo: { role_name: 'Patient' }
      },
      isLoading: false
    } as any);

    render(<RecordSoap soapId='obs-1' />);

    expect(screen.getByTestId('mock-patient-record-soap')).toBeInTheDocument();
  });

  it('renders PractitionerRecordSoap for practitioner role', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        userInfo: { role_name: 'Practitioner' }
      },
      isLoading: false
    } as any);

    render(<RecordSoap soapId='obs-1' />);

    expect(
      screen.getByTestId('mock-practitioner-record-soap')
    ).toBeInTheDocument();
  });

  it('shows loading spinner when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: null,
      isLoading: true
    } as any);

    render(<RecordSoap soapId='obs-1' />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
