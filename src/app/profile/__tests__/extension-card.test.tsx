import { render, screen } from '@testing-library/react';
import type { Patient, Practitioner } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import ExtensionCard from '../extension-card';

describe('ExtensionCard', () => {
  it('renders qualification rows for a Practitioner with qualifications', () => {
    const practitioner: Practitioner = {
      resourceType: 'Practitioner',
      id: 'pra-1',
      active: true,
      name: [{ use: 'official', given: ['Jane'] }],
      qualification: [
        {
          code: {
            coding: [{ code: 'SPEC', display: 'Specialist' }]
          },
          identifier: [
            { system: 'https://licenses.example.org', value: 'LIC-123' }
          ],
          issuer: { display: 'Ministry of Health' }
        }
      ]
    };
    const { container } = render(<ExtensionCard profile={practitioner} />);
    expect(screen.getByText('Specialist')).toBeDefined();
    expect(screen.getByText('LIC-123')).toBeDefined();
    expect(screen.getByText('Ministry of Health')).toBeDefined();
    expect(container.firstChild).not.toBeNull();
  });

  it('renders nothing for a Practitioner without qualifications', () => {
    const practitioner: Practitioner = {
      resourceType: 'Practitioner',
      id: 'pra-1',
      active: true,
      name: [{ use: 'official', given: ['Jane'] }]
    };
    const { container } = render(<ExtensionCard profile={practitioner} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders marital status for a Patient when present', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      id: 'pat-1',
      active: true,
      name: [{ use: 'official', given: ['John'] }],
      maritalStatus: { coding: [{ code: 'M', display: 'Married' }] }
    };
    const { container } = render(<ExtensionCard profile={patient} />);
    expect(screen.getByText('Married')).toBeDefined();
    expect(container.firstChild).not.toBeNull();
  });

  it('renders nothing for a Patient without marital status', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      id: 'pat-1',
      active: true,
      name: [{ use: 'official', given: ['John'] }]
    };
    const { container } = render(<ExtensionCard profile={patient} />);
    expect(container.firstChild).toBeNull();
  });
});
