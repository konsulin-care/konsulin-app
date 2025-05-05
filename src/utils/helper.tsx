import { IBundleResponse } from '@/types/record';
import {
  Annotation,
  Coding,
  HumanName,
  Observation,
  QuestionnaireItem,
  QuestionnaireResponse
} from 'fhir/r4';

export const mergeNames = (data: HumanName[]) => {
  if (!data || data.length === 0) {
    return '';
  }

  return data.map(item => [...item.given, item.family].join(' ')).join('');
};

export const customMarkdownComponents = {
  p: ({ children }) => <span>{children}</span>
};

export const parseRecordBundles = (bundles: IBundleResponse[]) => {
  const results = [];

  if (!Array.isArray(bundles)) return results;

  const extractObservation = (resource: Observation) => {
    const codeList = resource.code?.coding ?? [];
    const loincCode = codeList.find(
      (c: Coding) => c.system === 'http://loinc.org'
    )?.code;
    const notes = (resource.note ?? [])
      .map((n: Annotation) => n.text)
      .join('\n\n');

    if (loincCode === '51855-5') {
      return {
        type: 'Patient Note',
        id: `${resource.resourceType}/${resource.id}`,
        title: resource.valueString ?? '',
        result: notes,
        lastUpdated: resource.meta?.lastUpdated
      };
    }

    if (loincCode === '67855-7') {
      return {
        type: 'Practitioner Note',
        id: `${resource.resourceType}/${resource.id}`,
        title: resource.code?.coding?.[0]?.display ?? '',
        result: resource.valueString,
        lastUpdated: resource.meta?.lastUpdated
      };
    }

    return null;
  };

  const extractQuestionnaire = (resource: QuestionnaireResponse) => {
    const result =
      resource.item
        ?.find((i: QuestionnaireItem) => i.linkId === 'interpretation')
        ?.item?.find((i: QuestionnaireItem) => i.linkId === 'result-brief')
        ?.answer?.[0]?.valueString ?? null;

    return {
      type: 'QuestionnaireResponse',
      id: `${resource.resourceType}/${resource.id}`,
      title: resource.questionnaire,
      result,
      lastUpdated: resource.meta?.lastUpdated
    };
  };

  for (const bundleResponse of bundles) {
    const bundle = bundleResponse.resource;
    if (bundle.total <= 0 || !bundle.entry) continue;

    for (const entry of bundle.entry) {
      const resource = entry.resource;
      let parsed = null;

      if (resource.resourceType === 'Observation') {
        parsed = extractObservation(resource);
      } else if (resource.resourceType === 'QuestionnaireResponse') {
        parsed = extractQuestionnaire(resource);
      }

      if (parsed) results.push(parsed);
    }
  }

  // Sort by lastUpdated
  return results.sort(
    (a, b) =>
      new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
  );
};
