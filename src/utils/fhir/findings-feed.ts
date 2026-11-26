import type { ResearchStudy } from 'fhir/r4';
import { readFindings } from './study-findings';

/** One finding in the feed. */
export interface FindingsFeedItem {
  studyId: string;
  studyTitle: string;
  groupName?: string;
  text: string;
  time: string;
  participantCount?: number;
}

/** Input for buildFindingsFeed. */
export interface FindingsFeedInput {
  studies: ResearchStudy[];
  joinedIds: string[];
  floor: number;
  konsulinOrgId: string;
}

function isKonsulin(study: ResearchStudy, orgId: string): boolean {
  const ref = study.sponsor?.reference;
  if (!orgId) return !ref;
  return ref === `Organization/${orgId}`;
}

function itemsOf(
  study: ResearchStudy,
  floor: number,
  orgId: string
): FindingsFeedItem[] {
  const groupName = isKonsulin(study, orgId)
    ? undefined
    : study.sponsor?.display;
  return readFindings(study).map(f => ({
    studyId: study.id ?? '',
    studyTitle: study.title ?? '',
    groupName,
    text: f.text,
    time: f.time,
    participantCount:
      f.participantCount !== undefined && f.participantCount >= floor
        ? f.participantCount
        : undefined
  }));
}

/**
 * Build the findings feed: joined studies first, each group newest first.
 *
 * @param input - Studies, joined study ids, count floor and Konsulin org id
 * @returns Feed items; participantCount is set only at or above the floor
 */
export function buildFindingsFeed(
  input: FindingsFeedInput
): FindingsFeedItem[] {
  const { studies, joinedIds, floor, konsulinOrgId } = input;
  const all = studies.flatMap(s => {
    const joined = joinedIds.includes(s.id ?? '');
    return itemsOf(s, floor, konsulinOrgId).map(item => ({ item, joined }));
  });
  const byTime = (a: FindingsFeedItem, b: FindingsFeedItem): number =>
    Date.parse(b.time) - Date.parse(a.time);
  const pick = (j: boolean): FindingsFeedItem[] =>
    all
      .filter(x => x.joined === j)
      .map(x => x.item)
      .toSorted(byTime);
  return [...pick(true), ...pick(false)];
}
