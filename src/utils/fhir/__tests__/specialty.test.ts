import type { PractitionerRole } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { FhirSystems } from '../extensions';
import { buildSpecialtyPayload, getNuccSpecialtyCodes } from '../specialty';

const PSYCHOLOGIST = '103T00000X';
const PSYCHIATRY = '2084P0800X';

describe('getNuccSpecialtyCodes', () => {
  it('returns only NUCC-coded specialty codes, preserving order', () => {
    const role = {
      resourceType: 'PractitionerRole',
      id: 'pr-1',
      specialty: [
        {
          coding: [
            {
              system: FhirSystems.nuccTaxonomy,
              code: PSYCHOLOGIST,
              display: 'Psychologist'
            }
          ],
          text: 'Psychologist'
        },
        {
          coding: [
            {
              system: FhirSystems.nuccTaxonomy,
              code: PSYCHIATRY,
              display: 'Psychiatry Physician'
            }
          ],
          text: 'Psychiatry Physician'
        },
        {
          coding: [{ system: FhirSystems.snomedSct, code: '408443003' }],
          text: 'General medical practice'
        },
        { text: 'Text-only specialty' }
      ]
    } satisfies PractitionerRole;

    expect(getNuccSpecialtyCodes(role)).toEqual([PSYCHOLOGIST, PSYCHIATRY]);
  });

  it('returns an empty array when the role has no specialty', () => {
    const role = {
      resourceType: 'PractitionerRole',
      id: 'pr-1'
    } satisfies PractitionerRole;

    expect(getNuccSpecialtyCodes(role)).toEqual([]);
  });
});

describe('buildSpecialtyPayload', () => {
  const externalSnomed = {
    coding: [{ system: FhirSystems.snomedSct, code: '408443003' }],
    text: 'General medical practice'
  };

  it('replaces NUCC-coded concepts with the selected codes', () => {
    const role = {
      resourceType: 'PractitionerRole',
      id: 'pr-1',
      specialty: [
        {
          coding: [
            {
              system: FhirSystems.nuccTaxonomy,
              code: PSYCHOLOGIST,
              display: 'Psychologist'
            }
          ],
          text: 'Psychologist'
        },
        externalSnomed
      ]
    } satisfies PractitionerRole;

    const result = buildSpecialtyPayload(role, [PSYCHIATRY]);

    expect(result).toEqual([
      externalSnomed,
      {
        coding: [
          {
            system: FhirSystems.nuccTaxonomy,
            code: PSYCHIATRY,
            display: 'Psychiatry Physician'
          }
        ],
        text: 'Psychiatry Physician'
      }
    ]);
  });

  it('preserves external (non-NUCC) and text-only concepts on every save', () => {
    const role = {
      resourceType: 'PractitionerRole',
      id: 'pr-1',
      specialty: [externalSnomed, { text: 'Radiologist' }]
    } satisfies PractitionerRole;

    const result = buildSpecialtyPayload(role, [PSYCHOLOGIST]);

    expect(result.filter(c => !c.coding?.[0]?.system)).toContainEqual({
      text: 'Radiologist'
    });
    expect(result).toContainEqual(externalSnomed);
  });

  it('returns only external concepts when the selection is empty', () => {
    const role = {
      resourceType: 'PractitionerRole',
      id: 'pr-1',
      specialty: [
        {
          coding: [
            {
              system: FhirSystems.nuccTaxonomy,
              code: PSYCHOLOGIST,
              display: 'Psychologist'
            }
          ],
          text: 'Psychologist'
        },
        externalSnomed
      ]
    } satisfies PractitionerRole;

    expect(buildSpecialtyPayload(role, [])).toEqual([externalSnomed]);
  });

  it('drops selected codes that do not exist in the NUCC taxonomy', () => {
    const role = {
      resourceType: 'PractitionerRole',
      id: 'pr-1'
    } satisfies PractitionerRole;

    const result = buildSpecialtyPayload(role, ['NOT-A-CODE', PSYCHOLOGIST]);

    const codes = result.map(c => c.coding?.[0]?.code);
    expect(codes).toContain(PSYCHOLOGIST);
    expect(codes).not.toContain('NOT-A-CODE');
  });

  it('does not mutate the input role', () => {
    const role = {
      resourceType: 'PractitionerRole',
      id: 'pr-1',
      specialty: [
        {
          coding: [
            {
              system: FhirSystems.nuccTaxonomy,
              code: PSYCHOLOGIST,
              display: 'Psychologist'
            }
          ],
          text: 'Psychologist'
        },
        externalSnomed
      ]
    } satisfies PractitionerRole;
    const before = structuredClone(role);

    buildSpecialtyPayload(role, [PSYCHIATRY]);

    expect(role).toEqual(before);
    expect(role.specialty).toHaveLength(2);
  });
});
