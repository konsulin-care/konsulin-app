'use client';

import type { ResearchBatch } from '@/utils/fhir/research';
import { daysUntilBatch, toResearchBatch } from '@/utils/fhir/research';
import { useQuery } from '@tanstack/react-query';
import type { Bundle, PlanDefinition, ResearchStudy } from 'fhir/r4';
import { getAPI } from '../api';

/** A study with its associated batches and computed metadata. */
export interface ResearchStudyWithBatches {
  study: ResearchStudy;
  batches: ResearchBatch[];
  /** Batch whose effectivePeriod contains today, or null. */
  currentBatch: ResearchBatch | null;
  /** Calendar days remaining in the current batch, 0 when no active batch. */
  daysRemaining: number;
}

/** Dashboard data for the researcher home view. */
export interface ResearcherDashboardData {
  studies: ResearchStudyWithBatches[];
  totalParticipants: number;
}

/**
 * Extracts the bare id from a canonical or reference string.
 *
 * @param value - Reference string, e.g. "PlanDefinition/batch-1".
 * @returns The bare id, or null when unparseable.
 */
function extractIdFromReference(value?: string): string | null {
  if (!value) return null;
  const parts = value.split('/').filter(Boolean);
  return parts.at(-1) ?? null;
}

/**
 * Parses the studies + batches bundle and participant count into dashboard
 * data.
 *
 * @param studiesBundle - Bundle with ResearchStudy (match) and PlanDefinition
 *   (include) entries.
 * @param participantCount - Total participant count from _summary=count query.
 * @returns Typed dashboard data.
 */
export function parseResearcherDashboardBundle(
  studiesBundle: Bundle,
  participantCount: number
): ResearcherDashboardData {
  const today = new Date().toISOString().slice(0, 10);
  const entries = studiesBundle.entry ?? [];

  const studies = entries
    .filter(
      (
        entry
      ): entry is (typeof entries)[number] & { resource: ResearchStudy } =>
        entry.resource?.resourceType === 'ResearchStudy'
    )
    .map(entry => {
      const study = entry.resource;
      const planDefinitions = entries
        .filter(
          (e): e is (typeof entries)[number] & { resource: PlanDefinition } =>
            e.resource?.resourceType === 'PlanDefinition'
        )
        .map(e => e.resource);

      const protocolRefs = study.protocol ?? [];
      const batchIds = protocolRefs
        .map(ref => extractIdFromReference(ref.reference))
        .filter((id): id is string => id !== null);

      const batches = batchIds
        .map(id => planDefinitions.find(p => p.id === id))
        .filter((p): p is PlanDefinition => p !== null)
        .map(plan => toResearchBatch(plan))
        .filter((batch): batch is ResearchBatch => batch !== null)
        .toSorted((a, b) => a.start.localeCompare(b.start));

      const currentBatch =
        batches.find(batch => today >= batch.start && today <= batch.end) ??
        null;

      return {
        study,
        batches,
        currentBatch,
        daysRemaining: currentBatch ? daysUntilBatch(currentBatch.end) : 0
      };
    });

  return { studies, totalParticipants: participantCount };
}

/**
 * Fetches the researcher dashboard data: studies with batches and total
 * participant count.
 *
 * @param practitionerId - FHIR Practitioner id of the researcher.
 * @returns React Query result with ResearcherDashboardData.
 */
export function useResearcherDashboard(practitionerId: string | undefined) {
  return useQuery({
    queryKey: ['researcher-dashboard', practitionerId],
    enabled: Boolean(practitionerId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ResearcherDashboardData> => {
      if (!practitionerId) {
        throw new Error('Practitioner ID required');
      }

      const API = await getAPI();

      const [studiesResponse, countResponse] = await Promise.all([
        API.get<Bundle>(
          `/fhir/ResearchStudy?principalInvestigator=Practitioner/${practitionerId}&_include=ResearchStudy:protocol&_count=50`
        ),
        API.get<Bundle>(
          `/fhir/ResearchSubject?study:ResearchStudy.principalInvestigator=Practitioner/${practitionerId}&_summary=count`
        )
      ]);

      const participantCount = countResponse.data.total ?? 0;

      return parseResearcherDashboardBundle(
        studiesResponse.data,
        participantCount
      );
    }
  });
}
