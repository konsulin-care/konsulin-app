import { IBundleResponse } from '@/types/record';
import {
  Bundle,
  Coding,
  FhirResource,
  Observation,
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  QuestionnaireResponseItemAnswer
} from 'fhir/r4';

const extractObservationFromBundle = (resource: Observation) => {
  const codeList = resource.code?.coding ?? [];
  const loincCode = codeList.find(
    (c: Coding) => c.system === 'http://loinc.org'
  )?.code;
  const notes = (resource.note ?? []).map(n => n.text).join('\n\n');

  const practitionerRef = resource.performer?.[0]?.reference;
  const practitionerId = practitionerRef?.split('/')[1] ?? null;

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
      title: codeList?.[0]?.display ?? '',
      result: resource.valueString,
      lastUpdated: resource.meta?.lastUpdated,
      practitionerId
    };
  }

  return null;
};

const extractQuestionnaireFromBundle = (resource: QuestionnaireResponse) => {
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

const processBundleResource = (resource: FhirResource) => {
  if (resource.resourceType === 'Observation') {
    return extractObservationFromBundle(resource);
  }
  if (resource.resourceType === 'QuestionnaireResponse') {
    return extractQuestionnaireFromBundle(resource);
  }
  return null;
};

export const parseRecordBundles = (bundles: IBundleResponse[]) => {
  const results = [];

  if (!Array.isArray(bundles)) return results;

  for (const bundleResponse of bundles) {
    const bundle = bundleResponse.resource;
    if (
      bundle.resourceType !== 'Bundle' ||
      bundle.total <= 0 ||
      !bundle.entry
    ) {
      continue;
    }

    for (const entry of bundle.entry) {
      const parsed = processBundleResource(entry.resource);
      if (parsed) results.push(parsed);
    }
  }

  return results.sort(
    (a, b) =>
      new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
  );
};

const collectUniqueResources = (bundle: Bundle): Map<string, FhirResource> => {
  const uniqueMap = new Map<string, FhirResource>();

  if (
    !bundle ||
    bundle.resourceType !== 'Bundle' ||
    !Array.isArray(bundle.entry)
  )
    return uniqueMap;

  for (const outerEntry of bundle.entry) {
    const innerBundle = outerEntry.resource;

    if (
      innerBundle?.resourceType !== 'Bundle' ||
      !Array.isArray(innerBundle.entry)
    )
      continue;

    for (const innerEntry of innerBundle.entry) {
      const resource = innerEntry.resource;
      if (!resource?.resourceType || !resource.id) continue;

      const key = `${resource.resourceType}/${resource.id}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, resource);
      }
    }
  }

  return uniqueMap;
};

const extractValueObservation = (resource: Observation) => {
  const codeList = resource.code?.coding ?? [];
  const loincCode = codeList.find(
    (c: Coding) => c.system === 'http://loinc.org'
  )?.code;

  const notes = (resource.note ?? []).map(n => n.text).join('\n\n');

  const id = `${resource.resourceType}/${resource.id}`;
  const lastUpdated = resource.meta?.lastUpdated;

  const performerRef = resource.performer?.[0]?.reference ?? '';
  const practitionerId = performerRef.startsWith('Practitioner/')
    ? performerRef.split('/')[1]
    : null;

  if (loincCode === '51855-5') {
    return {
      type: 'Patient Note',
      id,
      title: resource.valueString ?? '',
      result: notes,
      lastUpdated
    };
  }

  return {
    type: 'Practitioner Note',
    id,
    title: codeList?.[0]?.display ?? '',
    result: resource.valueString ?? resource.valueCodeableConcept ?? '',
    lastUpdated,
    practitionerId
  };
};

const flattenItems = (
  node: QuestionnaireResponseItem
): QuestionnaireResponseItem[] => {
  const children = (node.item ?? []).flatMap(flattenItems);
  return [node, ...children];
};

const extractAnswerValue = (
  ans: QuestionnaireResponseItemAnswer
): string | boolean | number | null => {
  if ('valueString' in ans) return ans.valueString ?? null;
  if ('valueBoolean' in ans) return ans.valueBoolean ?? null;
  if ('valueInteger' in ans) return ans.valueInteger ?? null;
  if ('valueDate' in ans) return ans.valueDate ?? null;
  if ('valueQuantity' in ans)
    return `${ans.valueQuantity.value} ${ans.valueQuantity.unit}`;
  if ('valueCoding' in ans) return ans.valueCoding.display ?? null;
  return null;
};

const extractValuesFromSection = (section: QuestionnaireResponseItem) => {
  const values: Array<{
    section: string | undefined;
    label: string | undefined;
    value: string | boolean | number | null;
  }> = [];

  for (const item of section.item ?? []) {
    for (const field of flattenItems(item)) {
      if (!field.answer) continue;

      for (const ans of field.answer) {
        const val = extractAnswerValue(ans);
        if (val != null) {
          values.push({ section: section.text, label: field.text, value: val });
        }
      }
    }
  }

  return values;
};

export const extractSoapQuestionnaire = (resource: QuestionnaireResponse) => {
  const values: Array<{
    section: string | undefined;
    label: string | undefined;
    value: string | boolean | number | null;
  }> = [];

  const practitionerId = resource.author?.reference?.split('/')[1] ?? null;

  for (const section of resource.item ?? []) {
    values.push(...extractValuesFromSection(section));
  }

  return {
    type: 'SOAP Notes',
    id: `${resource.resourceType}/${resource.id}`,
    title: resource.questionnaire,
    result: values,
    lastUpdated: resource.meta?.lastUpdated,
    practitionerId
  };
};

const extractBriefQuestionnaire = (resource: QuestionnaireResponse) => {
  const brief =
    resource.item
      ?.find(i => i.linkId === 'interpretation')
      ?.item?.find(ii => ii.linkId === 'result-brief')?.answer?.[0]
      ?.valueString ?? '';

  return {
    type: 'QuestionnaireResponse',
    id: `${resource.resourceType}/${resource.id}`,
    title: resource.questionnaire,
    result: brief,
    lastUpdated: resource.meta?.lastUpdated
  };
};

export const parseRecordBundlePractitioner = (bundle: Bundle) => {
  if (
    !bundle ||
    bundle.resourceType !== 'Bundle' ||
    !Array.isArray(bundle.entry)
  )
    return [];

  const uniqueMap = collectUniqueResources(bundle);
  const results = [];

  for (const resource of Array.from(uniqueMap.values())) {
    if (!resource?.resourceType || !resource.id) continue;

    switch (resource.resourceType) {
      case 'Observation':
        results.push(extractValueObservation(resource));
        break;
      case 'QuestionnaireResponse':
        if (resource.questionnaire === 'Questionnaire/soap') {
          results.push(extractSoapQuestionnaire(resource));
        } else {
          results.push(extractBriefQuestionnaire(resource));
        }
        break;
    }
  }

  return results.sort(
    (a, b) =>
      new Date(b.lastUpdated || '').getTime() -
      new Date(a.lastUpdated || '').getTime()
  );
};
