import { typeMappings } from '@/constants/record';
import { MergedAppointment, MergedSession } from '@/types/appointment';
import { IBundleResponse } from '@/types/record';
import { parse } from 'date-fns';
import {
  Address,
  Annotation,
  Appointment,
  AppointmentParticipant,
  Bundle,
  BundleEntry,
  Coding,
  FhirResource,
  HumanName,
  Observation,
  Patient,
  Practitioner,
  PractitionerQualification,
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  Slot
} from 'fhir/r4';

export const mergeNames = (
  name: HumanName[],
  qualification?: PractitionerQualification[]
) => {
  if (!name || name.length === 0) {
    return '-';
  }
  const qualificationCode =
    qualification && qualification.length > 0
      ? qualification?.[0]?.code?.coding?.[0]?.code
      : '';

  const fullName = name
    .map(item => [...item.given, item.family].filter(Boolean).join(' '))
    .join('');

  return qualificationCode ? `${fullName}, ${qualificationCode}` : fullName;
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
        title: codeList?.[0]?.display ?? '',
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

// extracts unique Observations and QuestionnaireResponses from a nested FHIR Bundle.
export const parseRecordBundlePractitioner = (bundle: Bundle) => {
  const results = [];

  if (
    !bundle ||
    bundle.resourceType !== 'Bundle' ||
    !Array.isArray(bundle.entry)
  )
    return results;

  // map to store unique resources based on "resourceType/id"
  const uniqueMap = new Map<string, FhirResource>();

  // first-level: entry[].resource should be a Bundle
  for (const outerEntry of bundle.entry) {
    const innerBundle = outerEntry.resource;

    if (
      innerBundle?.resourceType !== 'Bundle' ||
      !Array.isArray(innerBundle.entry)
    )
      continue;

    // second-level: entry[].resource is actual Observation or QuestionnaireResponse
    for (const innerEntry of innerBundle.entry) {
      const resource = innerEntry.resource;
      if (!resource?.resourceType || !resource.id) continue;

      const key = `${resource.resourceType}/${resource.id}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, resource);
      }
    }
  }

  const extractObservation = (resource: Observation) => {
    const codeList = resource.code?.coding ?? [];
    const loincCode = codeList.find(
      (c: Coding) => c.system === 'http://loinc.org'
    )?.code;

    const notes = (resource.note ?? [])
      .map((n: Annotation) => n.text)
      .join('\n\n');

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

  const extractSoapQuestionnaire = (resource: QuestionnaireResponse) => {
    const values = [];
    const practitionerRef = resource.author?.reference;
    const practitionerId = practitionerRef?.split('/')[1] ?? null;

    for (const section of resource.item ?? []) {
      for (const item of section.item ?? []) {
        // recursively collect all nested items and extract answer values with type detection
        const collect = (node: QuestionnaireResponseItem) => {
          const children = (node.item ?? []).flatMap(collect);
          return [node, ...children];
        };

        for (const field of collect(item)) {
          if (!field.answer) continue;

          for (const ans of field.answer) {
            let val = null;

            if ('valueString' in ans) val = ans.valueString;
            else if ('valueBoolean' in ans) val = ans.valueBoolean;
            else if ('valueInteger' in ans) val = ans.valueInteger;
            else if ('valueDate' in ans) val = ans.valueDate;
            else if ('valueQuantity' in ans)
              val = `${ans.valueQuantity.value} ${ans.valueQuantity.unit}`;
            else if ('valueCoding' in ans) val = ans.valueCoding.display;

            if (val != null) {
              values.push({
                section: section.text,
                label: field.text,
                value: val
              });
            }
          }
        }
      }
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

  const extractQuestionnaire = (resource: QuestionnaireResponse) => {
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

  for (const resource of Array.from(uniqueMap.values())) {
    if (!resource?.resourceType || !resource.id) continue;

    if (resource.resourceType === 'Observation') {
      results.push(extractObservation(resource));
    } else if (resource.resourceType === 'QuestionnaireResponse') {
      if (resource.questionnaire === 'Questionnaire/soap') {
        results.push(extractSoapQuestionnaire(resource));
      } else {
        results.push(extractQuestionnaire(resource));
      }
    }
  }

  // sort by lastUpdated
  return results.sort(
    (a, b) =>
      new Date(b.lastUpdated || '').getTime() -
      new Date(a.lastUpdated || '').getTime()
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

export const parseMergedAppointments = (
  bundle: Bundle
): MergedAppointment[] => {
  const appointments = bundle.entry
    .filter(
      (entry: BundleEntry) => entry.resource.resourceType === 'Appointment'
    )
    .map((entry: BundleEntry) => entry.resource as Appointment);

  const slots = bundle.entry
    .filter((entry: BundleEntry) => entry.resource.resourceType === 'Slot')
    .map((entry: BundleEntry) => entry.resource as Slot);

  const practitioners = bundle.entry
    .filter(
      (entry: BundleEntry) => entry.resource.resourceType === 'Practitioner'
    )
    .map((entry: BundleEntry) => entry.resource as Practitioner);

  const results: MergedAppointment[] = [];

  appointments.forEach((appointment: Appointment) => {
    // extract slot id
    const slotReference = appointment.slot && appointment.slot[0]?.reference;
    const slotId = slotReference ? slotReference.split('/')[1] : null;

    // extract practitioner reference from participants
    const practitionerParticipant = appointment.participant.find(
      (participant: AppointmentParticipant) =>
        participant.actor.reference &&
        participant.actor.reference.startsWith('Practitioner/')
    );
    const practitionerId = practitionerParticipant
      ? practitionerParticipant.actor.reference.split('/')[1]
      : null;

    const slotData = slots.find((slot: Slot) => slot.id === slotId);
    const practitionerData = practitioners.find(
      (practitioner: Practitioner) => practitioner.id === practitionerId
    );
    const practitionerEmail = practitionerData.telecom.find(
      data => data.system === 'email'
    );

    results.push({
      appointmentId: appointment.id || null,
      slotStart: slotData?.start || null,
      slotEnd: slotData?.end || null,
      slotStatus: slotData?.status || null,
      appointmentType: appointment.appointmentType?.text || null,
      practitionerId: practitionerData?.id || null,
      practitionerName: practitionerData?.name || null,
      practitionerQualification: practitionerData?.qualification || null,
      practitionerPhoto: practitionerData?.photo || null,
      practitionerEmail: practitionerEmail.value || null
    });
  });

  // sort the results by slotStart in ascending order
  return results.sort((a, b) => {
    if (!a.slotStart || !b.slotStart) return 0;
    return new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime();
  });
};

export const parseTime = (timeStr: string, formatStr = 'HH:mm') => {
  return parse(timeStr, formatStr, new Date());
};

// generate a consistent color from an id
const getColorFromId = (id: string) => {
  if (!id) return;

  const saturation = 70;
  const lightness = 50;

  let hash = 0;
  for (const char of id) {
    hash += char.charCodeAt(0);
  }

  const hue = hash % 360;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const generateAvatarPlaceholder = ({
  id,
  name,
  email,
  userId
}: {
  id?: string;
  name?: string;
  email?: string;
  userId?: string;
}) => {
  const normalizedName =
    name?.trim() && name?.trim() !== '-' ? name.trim() : '';
  const seed = id || userId || email || normalizedName || '';

  let initials = '';
  if (normalizedName) {
    const parts = normalizedName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0][0] || '';
      const last = parts[parts.length - 1][0] || '';
      initials = `${first}${last}`;
    } else {
      initials = normalizedName.slice(0, 2);
    }
  } else if (email) {
    const local = email.includes('@') ? email.split('@')[0] : email;
    initials = local.slice(0, 2);
  } else if (userId) {
    initials = userId.slice(0, 2);
  }

  initials = initials.toUpperCase();

  const backgroundColor = seed ? getColorFromId(seed) : null;

  return { initials: initials || null, backgroundColor };
};

export const isDataUrl = (value: string) => {
  return typeof value === 'string' && value.startsWith('data:image/');
};

export const dataUrlToBlob = (dataUrl: string) => {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0]?.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const base64String = arr[1];
  const decode =
    typeof atob === 'function'
      ? atob(base64String)
      : typeof globalThis !== 'undefined' && (globalThis as any).Buffer
        ? (globalThis as any).Buffer.from(base64String, 'base64').toString(
            'binary'
          )
        : '';
  const bstr = decode;
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export const findIdentifierValue = (
  data: Patient | Practitioner,
  system: string
) => {
  return (
    data?.identifier?.find(identifier => identifier.system === system)?.value ??
    ''
  );
};

export const isValidImageUrl = async (url: string): Promise<boolean> => {
  if (!url) return false;
  if (isDataUrl(url)) return true;

  try {
    const response = await fetch(url, { method: 'GET', mode: 'no-cors' });

    // If the response is opaque due to CORS, assume OK so we don't block rendering.
    if (response.type === 'opaque') return true;

    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') || '';
    return contentType.startsWith('image/');
  } catch {
    // On network/CORS errors, fall back to true to avoid breaking avatars that still load in <img>.
    return true;
  }
};

export const formatTitle = (raw: string) => {
  if (!raw) return '-';

  const cleaned = raw.trim().replace(/\s+/g, ' ');

  if (cleaned.includes('-')) {
    // replace hyphens with spaces, capitalize first letter of each word
    return cleaned
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // if no hyphen, make the whole string uppercase
  return cleaned.toUpperCase();
};

export const formatQueryTitle = (raw: string) => {
  if (!raw) return '-';

  const withSpaces = raw.replace(/\+/g, ' ');

  return withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const mapAddress = (address: Address[]) => {
  if (!address || address.length === 0) return '-';

  const addr = address[0];
  const parts = [addr.line[0], addr.district, addr.city, addr.postalCode];

  return parts.filter(Boolean).join(', ');
};

export const findAge = (birthDateStr: string) => {
  const birthdate = new Date(birthDateStr);
  const today = new Date();

  if (isNaN(birthdate.getTime())) {
    return '-';
  }

  let age = today.getFullYear() - birthdate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthdate.getMonth() ||
    (today.getMonth() === birthdate.getMonth() &&
      today.getDate() >= birthdate.getDate());

  if (!hasHadBirthdayThisYear) {
    age--;
  }

  return age;
};

export const getUtcDayRange = (startLocalDate: Date, endLocalDate?: Date) => {
  const start = new Date(startLocalDate);
  start.setHours(0, 0, 0, 0); // 00:00:00 local time

  const end = new Date(endLocalDate ?? startLocalDate);
  end.setHours(23, 59, 59, 999); // 23:59:59 local time

  const utcStart = start.toISOString();
  const utcEnd = end.toISOString();

  return { utcStart, utcEnd };
};

export const parseMergedSessions = (bundle: Bundle): MergedSession[] => {
  const appointments = bundle.entry
    .filter(entry => entry.resource.resourceType === 'Appointment')
    .map(entry => entry.resource as Appointment);

  const slots = bundle.entry
    .filter(entry => entry.resource.resourceType === 'Slot')
    .map(entry => entry.resource as Slot);

  const patients = bundle.entry
    .filter(entry => entry.resource.resourceType === 'Patient')
    .map(entry => entry.resource as Patient);

  const results: MergedSession[] = [];

  appointments.forEach(appointment => {
    const slotReference = appointment.slot?.[0]?.reference;
    const slotId = slotReference ? slotReference.split('/')[1] : null;

    const patientParticipant = appointment.participant.find(
      (participant: AppointmentParticipant) =>
        participant.actor.reference &&
        participant.actor.reference.startsWith('Patient/')
    );

    const patientId = patientParticipant
      ? patientParticipant.actor.reference.split('/')[1]
      : null;

    const slotData = slots.find(slot => slot.id === slotId);
    const patientData = patients.find(patient => patient.id === patientId);

    const patientEmail = patientData.telecom.find(
      data => data.system === 'email'
    );

    results.push({
      appointmentId: appointment.id || null,
      slotStart: slotData?.start || null,
      slotEnd: slotData?.end || null,
      slotStatus: slotData?.status || null,
      appointmentType: appointment.appointmentType?.text || null,
      patientId: patientData?.id || null,
      patientName: patientData.name || null,
      patientPhoto: patientData?.photo || null,
      patientEmail: patientEmail.value || null
    });
  });

  return results.sort((a, b) => {
    if (!a.slotStart || !b.slotStart) return 0;
    return new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime();
  });
};

export const getTypeLabel = (type: string) => {
  if (!type || type === 'All') return null;

  const types = type.split(',').map(t => t.trim());

  // map each to its display label
  const label = types.map(type => typeMappings[type]?.text).filter(Boolean);

  // return the first label (they should all be the same if grouped correctly)
  return label[0] ?? null;
};
