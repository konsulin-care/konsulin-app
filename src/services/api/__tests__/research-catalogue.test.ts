import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchConsentedStudyIds,
  fetchStudiesByIds,
  fetchStudyCatalogue
} from '../research-catalogue';

const TODAY = '2026-08-15';

function page(id: string, next?: string): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    link: next ? [{ relation: 'next', url: next }] : [],
    entry: [
      {
        resource: {
          resourceType: 'ResearchStudy',
          id,
          status: 'active',
          protocol: [{ reference: `PlanDefinition/b-${id}` }]
        }
      },
      {
        resource: {
          resourceType: 'PlanDefinition',
          id: `b-${id}`,
          status: 'active',
          effectivePeriod: { start: '2026-08-01', end: '2026-08-31' },
          action: [{ definitionCanonical: 'Questionnaire/phq2' }]
        }
      }
    ]
  };
}

function fakeApi(pages: Bundle[]): {
  api: AxiosInstance;
  get: ReturnType<typeof vi.fn>;
} {
  const get = vi.fn();
  for (const data of pages) get.mockResolvedValueOnce({ data });
  return { api: { get } as unknown as AxiosInstance, get };
}

function subjects(items: [string, string][], next?: string): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    link: next ? [{ relation: 'next', url: next }] : [],
    entry: items.map(([study, status]) => ({
      resource: {
        resourceType: 'ResearchSubject',
        status,
        study: { reference: `ResearchStudy/${study}` },
        individual: { reference: 'Patient/p1' }
      }
    }))
  } as Bundle;
}

describe('research catalogue', () => {
  it('reads consents with a separate GET, on-study only, all pages', async () => {
    const { api, get } = fakeApi([
      subjects(
        [
          ['a', 'on-study'],
          ['x', 'withdrawn']
        ],
        'http://x/fhir/ResearchSubject?_page=2'
      ),
      subjects([['b', 'on-study']])
    ]);
    const ids = await fetchConsentedStudyIds(api, 'p1');
    expect(get.mock.calls[0][0]).toBe(
      '/fhir/ResearchSubject?patient=Patient/p1&_elements=study,status&_count=100'
    );
    expect(ids).toEqual(['a', 'b']);
  });

  it('GETs active studies with protocol included', async () => {
    const { api, get } = fakeApi([page('a')]);
    await fetchStudyCatalogue(api, TODAY);
    expect(get).toHaveBeenCalledWith(
      `/fhir/ResearchStudy?status=active&date=ge${TODAY}&_include=ResearchStudy:protocol&_count=50`
    );
  });

  it('follows next links and merges batches', async () => {
    const { api, get } = fakeApi([
      page('a', 'http://x/fhir/ResearchStudy?_page=2'),
      page('b')
    ]);
    const result = await fetchStudyCatalogue(api, TODAY);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][0]).toBe('/fhir/ResearchStudy?_page=2');
    expect(result.map(entry => entry.study.id)).toEqual(['a', 'b']);
    expect(result[1].batches).toHaveLength(1);
  });

  it('fetches by ids and skips the request for none', async () => {
    const { api, get } = fakeApi([page('a')]);
    expect(await fetchStudiesByIds(api, [])).toEqual([]);
    expect(get).not.toHaveBeenCalled();
    await fetchStudiesByIds(api, ['a', 'b']);
    expect(get).toHaveBeenCalledWith(
      '/fhir/ResearchStudy?_id=a,b&_include=ResearchStudy:protocol&_count=50'
    );
  });
});
