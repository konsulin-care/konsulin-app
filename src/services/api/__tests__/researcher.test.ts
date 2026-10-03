import type { Bundle, PlanDefinition, ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseResearcherDashboardBundle } from '../researcher';

function makeStudy(id: string, protocolRefs: string[] = []): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id,
    status: 'active',
    title: `Study ${id}`,
    description: `Description for ${id}`,
    period: { start: '2026-08-01', end: '2027-07-31' },
    principalInvestigator: { reference: 'Practitioner/test-id' },
    protocol: protocolRefs.map(reference => ({ reference }))
  };
}

function makePlan(
  id: string,
  start = '2026-08-01',
  end = '2026-08-31',
  questionnaireIds: string[] = ['phq2', 'big-five-inventory']
): PlanDefinition {
  return {
    resourceType: 'PlanDefinition',
    id,
    status: 'active',
    effectivePeriod: { start, end },
    action: questionnaireIds.map(qId => ({
      definitionCanonical: `Questionnaire/${qId}`
    }))
  };
}

function makeStudiesBundle(
  studies: ResearchStudy[],
  plans: PlanDefinition[]
): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [
      ...studies.map(study => ({
        resource: study,
        search: { mode: 'match' as const }
      })),
      ...plans.map(plan => ({
        resource: plan,
        search: { mode: 'include' as const }
      }))
    ]
  };
}

describe('parseResearcherDashboardBundle', () => {
  it('returns empty array when no studies in bundle', () => {
    const bundle = makeStudiesBundle([], []);
    const result = parseResearcherDashboardBundle(bundle, 0);
    expect(result.studies).toEqual([]);
    expect(result.totalParticipants).toBe(0);
  });

  it('parses studies with their batches', () => {
    const study = makeStudy('study-1', [
      'PlanDefinition/batch-1',
      'PlanDefinition/batch-2'
    ]);
    const batch1 = makePlan('batch-1', '2026-08-01', '2026-08-31');
    const batch2 = makePlan('batch-2', '2026-09-01', '2026-09-30');
    const bundle = makeStudiesBundle([study], [batch1, batch2]);

    const result = parseResearcherDashboardBundle(bundle, 0);

    expect(result.studies).toHaveLength(1);
    expect(result.studies[0].study.id).toBe('study-1');
    expect(result.studies[0].batches).toHaveLength(2);
    expect(result.studies[0].batches[0].id).toBe('batch-1');
    expect(result.studies[0].batches[1].id).toBe('batch-2');
  });

  it('identifies current batch based on today date', () => {
    const study = makeStudy('study-1', ['PlanDefinition/batch-1']);
    const batch1 = makePlan('batch-1', '2026-01-01', '2026-12-31', ['phq2']);
    const bundle = makeStudiesBundle([study], [batch1]);

    const result = parseResearcherDashboardBundle(bundle, 0);

    expect(result.studies[0].currentBatch?.id).toBe('batch-1');
  });

  it('calculates days remaining for current batch', () => {
    const study = makeStudy('study-1', ['PlanDefinition/batch-1']);
    const batch1 = makePlan('batch-1', '2026-08-01', '2026-12-31');
    const bundle = makeStudiesBundle([study], [batch1]);

    const result = parseResearcherDashboardBundle(bundle, 0);

    expect(result.studies[0].daysRemaining).toBeGreaterThan(0);
  });

  it('sets currentBatch to null when no batch contains today', () => {
    const study = makeStudy('study-1', ['PlanDefinition/batch-1']);
    const batch1 = makePlan('batch-1', '2026-06-01', '2026-06-30');
    const bundle = makeStudiesBundle([study], [batch1]);

    const result = parseResearcherDashboardBundle(bundle, 0);

    expect(result.studies[0].currentBatch).toBeNull();
    expect(result.studies[0].daysRemaining).toBe(0);
  });

  it('includes totalParticipants from count bundle', () => {
    const study = makeStudy('study-1', ['PlanDefinition/batch-1']);
    const batch1 = makePlan('batch-1');
    const bundle = makeStudiesBundle([study], [batch1]);

    const result = parseResearcherDashboardBundle(bundle, 42);

    expect(result.totalParticipants).toBe(42);
  });

  it('handles multiple studies', () => {
    const study1 = makeStudy('study-1', ['PlanDefinition/batch-1']);
    const study2 = makeStudy('study-2', ['PlanDefinition/batch-2']);
    const batch1 = makePlan('batch-1');
    const batch2 = makePlan('batch-2');
    const bundle = makeStudiesBundle([study1, study2], [batch1, batch2]);

    const result = parseResearcherDashboardBundle(bundle, 10);

    expect(result.studies).toHaveLength(2);
    expect(result.studies[0].study.id).toBe('study-1');
    expect(result.studies[1].study.id).toBe('study-2');
  });

  it('handles study with no protocol references', () => {
    const study = makeStudy('study-1', []);
    const bundle = makeStudiesBundle([study], []);

    const result = parseResearcherDashboardBundle(bundle, 0);

    expect(result.studies).toHaveLength(1);
    expect(result.studies[0].batches).toEqual([]);
    expect(result.studies[0].currentBatch).toBeNull();
  });
});
