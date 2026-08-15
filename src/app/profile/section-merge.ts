import type { CodeableConcept, Patient, Practitioner } from 'fhir/r4';

type ProfileResource = Patient | Practitioner;

export type PersonalInfoValues = {
  gender: string;
  birthDate: string;
  languageCode?: string;
  languageLabel?: string;
};

export type ContactValues = {
  email: string;
  phone: string;
};

export type AddressValues = {
  line: string[];
  district: string;
  city: string;
  province: string;
  postalCode: string;
};

/** Build a BCP-47 language CodeableConcept. */
function buildLanguageConcept(code: string, label: string): CodeableConcept {
  return {
    coding: [{ system: 'urn:ietf:bcp:47', code, display: label }]
  };
}

/**
 * Merge personal-info fields into the latest resource. The communication
 * language is written only for Patient (wrapped) and Practitioner (direct).
 */
export function mergePersonalInfo(
  latest: ProfileResource,
  values: PersonalInfoValues
): ProfileResource {
  const merged = {
    ...latest,
    gender: values.gender,
    birthDate: values.birthDate
  } as ProfileResource;

  if (!values.languageCode) return merged;
  const concept = buildLanguageConcept(
    values.languageCode,
    values.languageLabel ?? values.languageCode
  );

  if (merged.resourceType === 'Practitioner') {
    return { ...merged, communication: [concept] };
  }
  return { ...merged, communication: [{ language: concept }] };
}

/**
 * Sync-safe personal-info merge for the other roles of a multi-role user:
 * gender and birthDate only. The communication language stays per role, so
 * it is never written into another role's resource.
 */
export function mergePersonalInfoSync(
  latest: ProfileResource,
  values: PersonalInfoValues
): ProfileResource {
  return {
    ...latest,
    gender: values.gender,
    birthDate: values.birthDate
  } as ProfileResource;
}

/** Merge contact fields into a fresh telecom array. */
export function mergeContact(
  latest: ProfileResource,
  values: ContactValues
): ProfileResource {
  const telecom: Array<{
    system: 'phone' | 'email';
    use: 'mobile' | 'home';
    value: string;
  }> = [];
  const email = values.email.trim();
  const phone = values.phone.trim();
  if (email) telecom.push({ system: 'email', use: 'home', value: email });
  if (phone) telecom.push({ system: 'phone', use: 'mobile', value: phone });
  return { ...latest, telecom };
}

/** Merge address fields into a single home address entry. */
export function mergeAddress(
  latest: ProfileResource,
  values: AddressValues
): ProfileResource {
  return {
    ...latest,
    address: [
      {
        use: 'home',
        type: 'physical',
        line: values.line.filter(Boolean),
        district: values.district,
        city: values.city,
        state: values.province,
        postalCode: values.postalCode,
        country: 'ID'
      }
    ]
  };
}
