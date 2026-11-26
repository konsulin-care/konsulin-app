import {
  metadataFromStudy,
  studyMetadataShape
} from '@/app/research/study-metadata-schema';
import {
  setEthicsStatus,
  setSharesFindings,
  setWhoCanJoin
} from '@/utils/fhir/study-metadata';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';

const base: ResearchStudy = {
  resourceType: 'ResearchStudy',
  status: 'active',
  sponsor: { reference: 'Organization/g1', display: 'Group One' },
  principalInvestigator: { display: 'Dr A' },
  objective: [{ name: 'Does sleep help?' }]
};

describe('studyMetadataShape', () => {
  it('rejects an empty research question', () => {
    const result = studyMetadataShape.safeParse({
      researchQuestion: '   ',
      ethicsStatus: 'applying'
    });
    expect(result.success).toBe(false);
  });

  it('requires a known ethics status and keeps optional fields optional', () => {
    const missingEthics = studyMetadataShape.safeParse({
      researchQuestion: 'Why?'
    });
    expect(missingEthics.success).toBe(false);

    for (const ethicsStatus of ['applying', 'approved', 'exempt']) {
      const parsed = studyMetadataShape.safeParse({
        researchQuestion: 'Why?',
        ethicsStatus
      });
      expect(parsed.success).toBe(true);
    }

    const invalid = studyMetadataShape.safeParse({
      researchQuestion: 'Why?',
      ethicsStatus: 'pending'
    });
    expect(invalid.success).toBe(false);

    const parsed = studyMetadataShape.parse({
      researchQuestion: '  Why?  ',
      ethicsStatus: 'approved'
    });
    expect(parsed.researchQuestion).toBe('Why?');
    expect(parsed.whoCanJoin).toBeUndefined();
    expect(parsed.ethicsReference).toBeUndefined();
    expect(parsed.sharesFindings).toBe(false);
  });
});

describe('metadataFromStudy', () => {
  it('maps a stored study back to form values', () => {
    const study = setSharesFindings(
      setEthicsStatus(setWhoCanJoin(base, 'Adults 18+'), {
        code: 'approved',
        reference: 'EC-42'
      }),
      true
    );
    expect(metadataFromStudy(study)).toEqual({
      researchQuestion: 'Does sleep help?',
      whoCanJoin: 'Adults 18+',
      ethicsStatus: 'approved',
      ethicsReference: 'EC-42',
      sharesFindings: true
    });
  });

  it('falls back to defaults for a study without metadata', () => {
    const metadata = metadataFromStudy({
      resourceType: 'ResearchStudy',
      status: 'active'
    });
    expect(metadata.researchQuestion).toBe('');
    expect(metadata.whoCanJoin).toBeUndefined();
    expect(metadata.ethicsStatus).toBe('applying');
    expect(metadata.ethicsReference).toBeUndefined();
    expect(metadata.sharesFindings).toBe(false);
  });
});
