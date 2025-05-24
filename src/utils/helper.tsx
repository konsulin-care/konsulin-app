import { IBundleResponse } from '@/types/record';
import { parse } from 'date-fns';
import {
  Address,
  Annotation,
  Appointment,
  AppointmentParticipant,
  Attachment,
  Bundle,
  BundleEntry,
  Coding,
  HumanName,
  Observation,
  Patient,
  Practitioner,
  PractitionerQualification,
  QuestionnaireItem,
  QuestionnaireResponse,
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

export type MergedAppointment = {
  appointmentId: string;
  slotStart: string | null;
  slotEnd: string | null;
  slotStatus: string | null;
  appointmentType: string | null;
  practitionerId: string | null;
  practitionerName: HumanName[] | null;
  practitionerQualification: PractitionerQualification[] | null;
  practitionerPhoto: Attachment[] | null;
  practitionerEmail: string | null;
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

export const generateAvatarPlaceholder = ({ id, name, email }) => {
  if (!id || !email || !name) return { initials: null, backgroundColor: null };

  let initials = '';
  const isValidName = name && name.trim() && name.trim() !== '-';
  const parts = isValidName ? name.trim().split(' ') : [];

  if (parts.length >= 2) {
    // if the name has at least two parts, take the first letter of each
    initials = parts[0][0] + parts[1][0];
  } else {
    initials = email.slice(0, 2);
  }

  initials = initials.toUpperCase();

  // Get color for this unique ID
  const backgroundColor = getColorFromId(id);

  return { initials, backgroundColor };
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
