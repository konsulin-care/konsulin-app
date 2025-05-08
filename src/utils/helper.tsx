import { IBundleResponse } from '@/types/record';
import {
  Annotation,
  Coding,
  HumanName,
  Observation,
  Patient,
  Practitioner,
  QuestionnaireItem,
  QuestionnaireResponse
} from 'fhir/r4';

export const mergeNames = (data: HumanName[]) => {
  if (!data || data.length === 0) {
    return '-';
  }

  return data
    .map(item => [...item.given, item.family].filter(Boolean).join(' '))
    .join('');
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
        title: resource.code?.coding?.[0]?.display ?? '',
        result: resource.valueString,
        lastUpdated: resource.meta?.lastUpdated,
        practitionerId
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

export const parseFhirProfile = (data: Patient | Practitioner) => {
  const phone = data.telecom?.find(t => t.system === 'phone')?.value ?? '';
  const email = data.telecom?.find(t => t.system === 'email')?.value ?? '';
  const name = data.name?.[0];
  const addresses = data.address?.[0];
  const userId =
    data.identifier?.find(
      id => id.system === 'https://login.konsulin.care/userid'
    )?.value ?? '';

  return {
    fhirId: data.id,
    resourceType: data.resourceType,
    active: data.active,
    birthDate: data.birthDate,
    gender: data.gender,
    photo: data.photo?.[0]?.url ?? '',
    userId,
    firstName: name ? name.given.join(' ') : '',
    lastName: name?.family ?? '',
    addresses: addresses?.line ?? [],
    cityCode: '',
    city: addresses?.city ?? '',
    districtCode: '',
    district: addresses?.district ?? '',
    provinceCode: '',
    province: '',
    postalCode: addresses?.postalCode ?? '',
    phone,
    email
  };
};

export const removeCityPrefix = (input: string): string => {
  if (!input) return '';

  return input.replace(/^(Kab\.|Kota)\s+/i, '').trim();
};
