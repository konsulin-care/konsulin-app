import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import type { FormData } from '../research-form';
import { buildPlanEntries, buildStudyEntry } from '../submit-helpers';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock('@/services/api', () => ({
  getAPI: () => Promise.resolve({ post: vi.fn() })
}));

function makeStudy(overrides?: Partial<ResearchStudy>): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id: 'study-1',
    title: 'Test Study',
    description: 'Desc',
    status: 'active',
    principalInvestigator: { reference: 'Practitioner/pi-1' },
    protocol: [{ reference: 'PlanDefinition/plan-1' }],
    period: { start: '2026-01-01', end: '2026-06-30' },
    ...overrides
  };
}

function makePlan(overrides?: Partial<PlanDefinition>): PlanDefinition {
  return {
    resourceType: 'PlanDefinition',
    id: 'plan-1',
    title: 'Batch 1',
    status: 'active',
    effectivePeriod: { start: '2026-01-01', end: '2026-03-31' },
    action: [{ definitionCanonical: 'Questionnaire/q1' }],
    ...overrides
  };
}

function makeBatch(
  overrides?: Partial<FormData['batches'][number]>
): FormData['batches'][number] {
  return {
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    questionnaireIds: ['q1'],
    ...overrides
  };
}

describe('buildPlanEntries', () => {
  it('creates POST entry with urn:uuid fullUrl for new batch (no planId)', () => {
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [makeBatch()]
    };
    const result = buildPlanEntries(data, [undefined], [], []);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].fullUrl).toMatch(/^urn:uuid:/);
    expect(result.entries[0].request).toEqual({
      method: 'POST',
      url: 'PlanDefinition'
    });
    expect(result.entries[0].resource).toMatchObject({
      resourceType: 'PlanDefinition',
      status: 'active'
    });
    expect(result.newPlanTempIds.size).toBe(1);
    expect(result.newPlanTempIds.get(0)).toBe(
      (result.entries[0].fullUrl as string).replace('urn:uuid:', '')
    );
  });

  it('creates PUT entry for modified existing batch', () => {
    const plan = makePlan();
    const batch = makeBatch({ startDate: '2026-02-01' }); // changed
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [batch]
    };
    const result = buildPlanEntries(data, ['plan-1'], [], [plan]);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].request).toEqual({
      method: 'PUT',
      url: 'PlanDefinition/plan-1'
    });
    expect((result.entries[0].resource as Record<string, unknown>).id).toBe(
      'plan-1'
    );
    expect(result.newPlanTempIds.size).toBe(0);
  });

  it('skips unmodified existing batch', () => {
    const plan = makePlan();
    const batch = makeBatch(); // same as plan
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [batch]
    };
    const result = buildPlanEntries(data, ['plan-1'], [], [plan]);

    expect(result.entries).toHaveLength(0);
    expect(result.newPlanTempIds.size).toBe(0);
  });

  it('skips locked batch', () => {
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [makeBatch()]
    };
    const result = buildPlanEntries(data, [undefined], [0], []);

    expect(result.entries).toHaveLength(0);
    expect(result.newPlanTempIds.size).toBe(0);
  });

  it('handles mix of new, modified, unmodified, and locked batches', () => {
    const plan1 = makePlan({ id: 'plan-1' });
    const plan2 = makePlan({
      id: 'plan-2',
      effectivePeriod: { start: '2026-04-01', end: '2026-06-30' },
      action: [{ definitionCanonical: 'Questionnaire/q2' }]
    });
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [
        makeBatch(), // batch 0: unmodified existing (plan-1)
        makeBatch({
          startDate: '2026-04-01',
          endDate: '2026-06-30',
          questionnaireIds: ['q2', 'q3']
        }), // batch 1: modified existing (plan-2) — added q3
        makeBatch({
          startDate: '2026-07-01',
          endDate: '2026-09-30',
          questionnaireIds: ['q4']
        }) // batch 2: new (no planId)
      ]
    };
    const result = buildPlanEntries(
      data,
      ['plan-1', 'plan-2', undefined],
      [], // nothing locked
      [plan1, plan2]
    );

    // batch 0: skipped (unmodified)
    // batch 1: PUT (modified)
    // batch 2: POST (new)
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].request).toEqual({
      method: 'PUT',
      url: 'PlanDefinition/plan-2'
    });
    expect(result.entries[1].fullUrl).toMatch(/^urn:uuid:/);
    expect(result.entries[1].request).toEqual({
      method: 'POST',
      url: 'PlanDefinition'
    });
    expect(result.newPlanTempIds.size).toBe(1);
    expect(result.newPlanTempIds.has(2)).toBe(true);
  });
});

describe('buildStudyEntry', () => {
  it('includes urn:uuid references for new batches', () => {
    const study = makeStudy({ protocol: [] });
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [
        makeBatch({
          startDate: '2026-01-01',
          endDate: '2026-03-31',
          questionnaireIds: ['q1']
        })
      ]
    };
    const tempIdMap = new Map([[0, 'temp-uuid-abc']]);

    const entry = buildStudyEntry(study, [undefined], tempIdMap, data);

    expect(entry.resource.protocol).toEqual([
      { reference: 'urn:uuid:temp-uuid-abc' }
    ]);
  });

  it('includes real references for existing batches', () => {
    const study = makeStudy();
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [makeBatch()]
    };

    const entry = buildStudyEntry(study, ['plan-1'], new Map(), data);

    expect(entry.resource.protocol).toEqual([
      { reference: 'PlanDefinition/plan-1' }
    ]);
  });

  it('handles mix of new and existing batch references', () => {
    const study = makeStudy({
      protocol: [{ reference: 'PlanDefinition/plan-1' }]
    });
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [
        makeBatch(),
        makeBatch({
          startDate: '2026-04-01',
          endDate: '2026-06-30',
          questionnaireIds: ['q2']
        })
      ]
    };
    const tempIdMap = new Map([[1, 'temp-uuid-def']]);

    const entry = buildStudyEntry(
      study,
      ['plan-1', undefined],
      tempIdMap,
      data
    );

    expect(entry.resource.protocol).toEqual([
      { reference: 'PlanDefinition/plan-1' },
      { reference: 'urn:uuid:temp-uuid-def' }
    ]);
  });

  it('derives period from all batch dates', () => {
    const study = makeStudy();
    const data: FormData = {
      title: 'Study',
      description: 'Desc',
      batches: [
        makeBatch({ startDate: '2026-03-01', endDate: '2026-06-30' }),
        makeBatch({ startDate: '2026-01-01', endDate: '2026-09-30' })
      ]
    };

    const entry = buildStudyEntry(study, ['plan-1', 'plan-2'], new Map(), data);

    // period start = earliest start, period end = latest end
    expect(entry.resource.period).toEqual({
      start: '2026-01-01',
      end: '2026-09-30'
    });
  });
});
