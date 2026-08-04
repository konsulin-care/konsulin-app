'use client';

import Notfound from '@/app/not-found';
import { isLoincSystem } from '@/utils/fhir';
import type { Money, Observation, QuestionnaireResponse } from 'fhir/r4';
import type { ReactNode } from 'react';
import RecordAssessment from './record-assessment';
import RecordCondition from './record-condition';
import RecordJournal from './record-journal';
import RecordSoap from './record-soap';

/** Check if Observation is a patient journal (LOINC 51855-5). */
export function isPatientJournal(resource: Observation): boolean {
  return (
    resource.code?.coding?.some(
      c => isLoincSystem(c.system) && c.code === '51855-5'
    ) ?? false
  );
}

/** Check if Observation is a practitioner note (LOINC 67855-7). */
export function isPractitionerNote(resource: Observation): boolean {
  return (
    resource.code?.coding?.some(
      c => isLoincSystem(c.system) && c.code === '67855-7'
    ) ?? false
  );
}

/** Check if QuestionnaireResponse is a SOAP note. */
export function isSoapNote(resource: QuestionnaireResponse): boolean {
  return resource.questionnaire === 'Questionnaire/soap';
}

export type RenderHandler = (props: {
  resourceId: string;
  data: Record<string, unknown>;
  onTitleChange?: (title: string) => void;
  onPractitionerNameChange?: (name: string) => void;
  onFeeChange?: (fee: Money | null) => void;
}) => ReactNode;

/**
 * Render the record view for a Condition resource.
 */
export function renderCondition({
  resourceId
}: {
  readonly resourceId: string;
}): ReactNode {
  return <RecordCondition conditionId={resourceId} />;
}

/**
 * Render the record view for a QuestionnaireResponse resource.
 *
 * SOAP notes go to RecordSoap; assessment results go to RecordAssessment,
 * which also reports the originating questionnaire's fee via onFeeChange.
 */
export function renderQuestionnaireResponse({
  resourceId,
  data,
  onTitleChange,
  onFeeChange
}: {
  readonly resourceId: string;
  readonly data: Record<string, unknown>;
  readonly onTitleChange?: (title: string) => void;
  readonly onFeeChange?: (fee: Money | null) => void;
}): ReactNode {
  const qr = data as unknown as QuestionnaireResponse;
  if (isSoapNote(qr)) {
    return <RecordSoap soapId={resourceId} />;
  }
  return (
    <RecordAssessment
      recordId={resourceId}
      onTitleChange={onTitleChange}
      onFeeChange={onFeeChange}
    />
  );
}

/**
 * Render the record view for an Observation resource.
 */
export function renderObservation({
  resourceId,
  data,
  onPractitionerNameChange
}: {
  readonly resourceId: string;
  readonly data: Record<string, unknown>;
  readonly onPractitionerNameChange?: (name: string) => void;
}): ReactNode {
  const obs = data as unknown as Observation;
  if (isPatientJournal(obs)) {
    return <RecordJournal journalId={resourceId} />;
  }
  if (isPractitionerNote(obs)) {
    return (
      <RecordSoap
        soapId={resourceId}
        onPractitionerNameChange={onPractitionerNameChange}
      />
    );
  }
  return <Notfound />;
}

export const RESOURCE_RENDERERS = new Map<string, RenderHandler>([
  ['Condition', renderCondition],
  ['QuestionnaireResponse', renderQuestionnaireResponse],
  ['Observation', renderObservation]
]);

/**
 * Resolve the title for a Condition record.
 */
export function conditionTitle(): string {
  return 'Condition Detail';
}

/**
 * Resolve the title for a QuestionnaireResponse record.
 */
export function questionnaireResponseTitle(
  data: Record<string, unknown>
): string {
  if (isSoapNote(data as unknown as QuestionnaireResponse)) {
    return 'SOAP Detail';
  }
  return 'Assessment Result';
}

/**
 * Resolve the title for an Observation record.
 */
export function observationTitle(data: Record<string, unknown>): string {
  if (isPatientJournal(data as unknown as Observation)) {
    return 'Journal Detail';
  }
  if (isPractitionerNote(data as unknown as Observation)) {
    return 'SOAP Detail';
  }
  return 'Detail';
}

export const RESOURCE_TITLES = new Map<
  string,
  (data: Record<string, unknown>) => string
>([
  ['Condition', conditionTitle],
  ['QuestionnaireResponse', questionnaireResponseTitle],
  ['Observation', observationTitle]
]);
