import {
  getEthicsStatus,
  getSharesFindings,
  getWhoCanJoin,
  setEthicsStatus,
  setSharesFindings,
  setWhoCanJoin
} from '@/utils/fhir/study-metadata';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';

const base: ResearchStudy = { resourceType: 'ResearchStudy', status: 'active' };

describe('study-metadata', () => {
  it('who-can-join round-trips and a second set replaces the first', () => {
    const a = setWhoCanJoin(base, 'Adults');
    const b = setWhoCanJoin(a, 'Students');
    expect(getWhoCanJoin(a)).toBe('Adults');
    expect(getWhoCanJoin(b)).toBe('Students');
    expect(b.extension).toHaveLength(1);
  });

  it('ethics status round-trips the code and the optional reference', () => {
    expect(getEthicsStatus(setEthicsStatus(base, { code: 'exempt' }))).toEqual({
      code: 'exempt'
    });
    expect(
      getEthicsStatus(
        setEthicsStatus(base, { code: 'approved', reference: 'REF-1' })
      )
    ).toEqual({ code: 'approved', reference: 'REF-1' });
    expect(getEthicsStatus(base)).toBeUndefined();
  });

  it('shares-findings round-trips and unrelated extensions are preserved', () => {
    const withOther: ResearchStudy = {
      ...base,
      extension: [{ url: 'http://x/other', valueString: 'keep' }]
    };
    const out = setSharesFindings(withOther, false);
    expect(getSharesFindings(out)).toBe(false);
    expect(out.extension?.some(e => e.url === 'http://x/other')).toBe(true);
    expect(withOther.extension).toHaveLength(1);
  });
});
