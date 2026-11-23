import type { Extension, ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { FhirExtensionUrls } from '../extensions';
import { getResearchTarget, setResearchTarget } from '../research-target';

const OTHER_EXTENSION: Extension = {
  url: 'https://example.com/other',
  valueString: 'keep-me'
};

/** Builds a research study with optional extensions. */
function makeStudy(extension?: Extension[]): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id: 'study-1',
    status: 'active',
    extension
  };
}

describe('getResearchTarget', () => {
  it('returns the valuePositiveInt of the target extension', () => {
    const study = makeStudy([
      {
        url: FhirExtensionUrls.researchTargetParticipants,
        valuePositiveInt: 40
      }
    ]);

    expect(getResearchTarget(study)).toBe(40);
  });

  it('returns null when the target extension is absent', () => {
    expect(getResearchTarget(makeStudy())).toBeNull();
  });

  it('returns null when only unrelated extensions exist', () => {
    expect(getResearchTarget(makeStudy([OTHER_EXTENSION]))).toBeNull();
  });
});

describe('setResearchTarget', () => {
  it('adds the target extension to a study with no extensions', () => {
    const result = setResearchTarget(makeStudy(), 40);

    expect(result.extension).toEqual([
      {
        url: FhirExtensionUrls.researchTargetParticipants,
        valuePositiveInt: 40
      }
    ]);
  });

  it('replaces an existing target and keeps every other extension', () => {
    const study = makeStudy([
      OTHER_EXTENSION,
      {
        url: FhirExtensionUrls.researchTargetParticipants,
        valuePositiveInt: 10
      }
    ]);

    const result = setResearchTarget(study, 40);

    expect(getResearchTarget(result)).toBe(40);
    expect(result.extension).toEqual([
      OTHER_EXTENSION,
      {
        url: FhirExtensionUrls.researchTargetParticipants,
        valuePositiveInt: 40
      }
    ]);
  });

  it('does not mutate the input study', () => {
    const study = makeStudy([OTHER_EXTENSION]);
    const snapshot = structuredClone(study);

    setResearchTarget(study, 40);

    expect(study).toEqual(snapshot);
  });
});
