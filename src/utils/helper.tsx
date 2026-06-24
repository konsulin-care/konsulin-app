import { typeMappings } from '@/constants/record';
import { MergedAppointment, MergedSession } from '@/types/appointment';
import { parse } from 'date-fns';
import {
  Address,
  Appointment,
  AppointmentParticipant,
  Bundle,
  BundleEntry,
  HumanName,
  Patient,
  Practitioner,
  PractitionerQualification,
  Slot
} from 'fhir/r4';

/** Merge human names with optional qualification code. */
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
    .map(item =>
      [...(item.given ?? []), item.family || ''].filter(Boolean).join(' ')
    )
    .join('');

  return qualificationCode ? `${fullName}, ${qualificationCode}` : fullName;
};

export const customMarkdownComponents = {
  p: ({ children, ...props }: any) => <span {...props}>{children}</span>
};

/** Parse FHIR Patient or Practitioner profile. */
function extractTelecom(data: Patient | Practitioner) {
  return {
    phone: data.telecom?.find(t => t.system === 'phone')?.value ?? '',
    email: data.telecom?.find(t => t.system === 'email')?.value ?? ''
  };
}

/** Extract display name from a FHIR Patient/Practitioner resource. */
function extractName(data: Patient | Practitioner) {
  const name = data.name?.[0];
  return {
    firstName: name ? (name.given?.join(' ') ?? '') : '',
    lastName: name?.family ?? ''
  };
}

/** Extract first address line from FHIR Patient/Practitioner resource. */
function extractAddress(data: Patient | Practitioner) {
  const addresses = data.address?.[0];
  return {
    addresses: addresses?.line ?? [],
    city: addresses?.city ?? '',
    district: addresses?.district ?? '',
    postalCode: addresses?.postalCode ?? ''
  };
}

/** Extract FHIR ID from Patient/Practitioner resource. */
function extractUserId(data: Patient | Practitioner) {
  return (
    data.identifier?.find(
      id => id.system === 'https://login.konsulin.care/userid'
    )?.value ?? ''
  );
}

/** Parse a FHIR Patient/Practitioner resource into a flat profile object. */
export const parseFhirProfile = (data: Patient | Practitioner) => {
  return {
    fhirId: data.id,
    resourceType: data.resourceType,
    active: data.active,
    birthDate: data.birthDate,
    gender: data.gender,
    photo: data.photo?.[0]?.url ?? '',
    userId: extractUserId(data),
    ...extractName(data),
    ...extractAddress(data),
    ...extractTelecom(data),
    cityCode: '',
    districtCode: '',
    provinceCode: '',
    province: ''
  };
};

/** Extract slot ID from the first appointment participant. */
function getSlotId(appointment: Appointment): string | null {
  const ref = appointment.slot?.[0]?.reference;
  return ref ? ref.split('/')[1] : null;
}

/** Extract practitioner ID from the first appointment participant. */
function getPractitionerId(appointment: Appointment): string | null {
  const participant = appointment.participant.find(
    (p: AppointmentParticipant) =>
      p.actor?.reference?.startsWith('Practitioner/')
  );
  return participant
    ? (participant.actor?.reference?.split('/')[1] ?? null)
    : null;
}

/** Merge practitioner/slot details into appointment records. */
function mergeAppointmentData(
  appointment: Appointment,
  slots: Slot[],
  practitioners: Practitioner[]
): MergedAppointment {
  const slotData = slots.find((s: Slot) => s.id === getSlotId(appointment));
  const practitionerData = practitioners.find(
    (p: Practitioner) => p.id === getPractitionerId(appointment)
  );
  return buildMergedAppointment(appointment, slotData, practitionerData);
}

// eslint-disable-next-line complexity
function buildMergedAppointment(
  appointment: Appointment,
  slotData: Slot | undefined,
  practitionerData: Practitioner | undefined
): MergedAppointment {
  const email = practitionerData?.telecom?.find(t => t.system === 'email');
  return {
    appointmentId: appointment.id ?? '',
    slotStart: slotData?.start ?? null,
    slotEnd: slotData?.end ?? null,
    slotStatus: slotData?.status ?? null,
    appointmentType: appointment.appointmentType?.text ?? null,
    practitionerId: practitionerData?.id ?? null,
    practitionerName: practitionerData?.name ?? null,
    practitionerQualification: practitionerData?.qualification ?? null,
    practitionerPhoto: practitionerData?.photo ?? null,
    practitionerEmail: email?.value ?? null
  };
}

/** Parse and merge appointment bundle data. */
export const parseMergedAppointments = (
  bundle: Bundle
): MergedAppointment[] => {
  const appointments = (bundle.entry ?? [])
    .filter(
      (entry: BundleEntry) => entry.resource?.resourceType === 'Appointment'
    )
    .map((entry: BundleEntry) => entry.resource as Appointment);

  const slots = (bundle.entry ?? [])
    .filter((entry: BundleEntry) => entry.resource?.resourceType === 'Slot')
    .map((entry: BundleEntry) => entry.resource as Slot);

  const practitioners = (bundle.entry ?? [])
    .filter(
      (entry: BundleEntry) => entry.resource?.resourceType === 'Practitioner'
    )
    .map((entry: BundleEntry) => entry.resource as Practitioner);

  // sort the results by slotStart in ascending order
  return appointments
    .map(appointment => mergeAppointmentData(appointment, slots, practitioners))
    .toSorted((a, b) => {
      if (!a.slotStart || !b.slotStart) return 0;
      return new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime();
    });
};

/** Parse a time string using date-fns parse. */
export const parseTime = (timeStr: string, formatStr = 'HH:mm') => {
  return parse(timeStr, formatStr, new Date());
};

// generate a consistent color from an id
const getColorFromId = (id: string) => {
  if (!id) return '';

  const saturation = 70;
  const lightness = 50;

  let hash = 0;
  for (const char of id) {
    hash += char.charCodeAt(0);
  }

  const hue = hash % 360;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/** Generate avatar placeholder with initials and color. */
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
  // eslint-disable-next-line complexity
}) => {
  const normalizedName =
    name?.trim() && name?.trim() !== '-' ? name.trim() : '';
  const seed = id || userId || email || normalizedName || '';

  let initials = '';
  if (normalizedName) {
    const parts = normalizedName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0][0] || '';
      const last = parts.at(-1)?.[0] ?? '';
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

  return { initials: initials || null, backgroundColor, seed };
};

/* eslint-disable max-lines */
export const isDataUrl = (value: string) => {
  return typeof value === 'string' && value.startsWith('data:image/');
};

/** Decode a base64 string using available API. */
function decodeBase64(
  base64String: string,
  env: {
    Buffer?: {
      from: (s: string, enc: string) => { toString: (enc: string) => string };
    };
  }
): string {
  if (typeof atob === 'function') return atob(base64String);
  if (typeof env.Buffer?.from === 'function') {
    return env.Buffer.from(base64String, 'base64').toString('binary');
  }
  return '';
}

/** Convert a data URL to a Blob object. */
export const dataUrlToBlob = (dataUrl: string) => {
  const arr = dataUrl.split(',');
  const mime = arr[0]?.split(';')[0]?.split(':')[1] ?? 'image/png';
  const base64String = arr[1];

  interface BufferLike {
    from: (s: string, enc: string) => { toString: (enc: string) => string };
  }

  const gThis = globalThis as unknown as { Buffer?: BufferLike };
  const decode = decodeBase64(base64String, gThis);
  if (!decode) {
    throw new Error('Base64 decoding not supported in this environment');
  }
  const bstr = decode;
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/** Find identifier value by system from FHIR resource. */
export const findIdentifierValue = (
  data: Patient | Practitioner,
  system: string
) => {
  return (
    data?.identifier?.find(identifier => identifier.system === system)?.value ??
    ''
  );
};

/** Check if a URL points to a valid image. */
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
    // the implementation will return false if the image URL is not valid
    // and it is up to the caller to decide how to handle it
    return false;
  }
};

/** Format a raw title string with proper casing. */
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

/** Format a query title by replacing + with spaces and capitalizing. */
export const formatQueryTitle = (raw: string) => {
  if (!raw) return '-';

  const withSpaces = raw.replace(/\+/g, ' ');

  return withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/** Map FHIR Address to a formatted string. */
export const mapAddress = (address: Address[]) => {
  if (!address || address.length === 0) return '-';

  const addr = address[0];
  const parts = [addr.line?.[0], addr.district, addr.city, addr.postalCode];

  return parts.filter(Boolean).join(', ');
};

/** Calculate age from a birth date string. */
export const findAge = (birthDateStr: string): string => {
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

  return String(age);
};

/** Get UTC day range from local dates. */
export const getUtcDayRange = (startLocalDate: Date, endLocalDate?: Date) => {
  const start = new Date(startLocalDate);
  start.setHours(0, 0, 0, 0); // 00:00:00 local time

  const end = new Date(endLocalDate ?? startLocalDate);
  end.setHours(23, 59, 59, 999); // 23:59:59 local time

  const utcStart = start.toISOString();
  const utcEnd = end.toISOString();

  return { utcStart, utcEnd };
};

// eslint-disable-next-line complexity
function mergeSessionData(
  appointment: Appointment,
  slots: Slot[],
  patients: Patient[]
): MergedSession {
  const ref = appointment.slot?.[0]?.reference;
  const slotId = ref ? ref.split('/')[1] : null;

  const participant = appointment.participant.find(
    (p: AppointmentParticipant) => p.actor?.reference?.startsWith('Patient/')
  );
  const patientId = participant
    ? (participant.actor?.reference?.split('/')[1] ?? null)
    : null;

  const slotData = slots.find(s => s.id === slotId);
  const patientData = patients.find(p => p.id === patientId);
  const email = patientData?.telecom?.find(t => t.system === 'email');

  return {
    appointmentId: appointment.id ?? '',
    slotStart: slotData?.start ?? null,
    slotEnd: slotData?.end ?? null,
    slotStatus: slotData?.status ?? null,
    appointmentType: appointment.appointmentType?.text ?? null,
    patientId: patientData?.id ?? '',
    patientName: patientData?.name ?? [],
    patientPhoto: patientData?.photo ?? [],
    patientEmail: email?.value ?? ''
  };
}

/** Parse and merge session bundle data. */
export const parseMergedSessions = (bundle: Bundle): MergedSession[] => {
  const appointments = (bundle.entry ?? [])
    .filter(entry => entry.resource?.resourceType === 'Appointment')
    .map(entry => entry.resource as Appointment);

  const slots = (bundle.entry ?? [])
    .filter(entry => entry.resource?.resourceType === 'Slot')
    .map(entry => entry.resource as Slot);

  const patients = (bundle.entry ?? [])
    .filter(entry => entry.resource?.resourceType === 'Patient')
    .map(entry => entry.resource as Patient);

  return appointments
    .map(appointment => mergeSessionData(appointment, slots, patients))
    .toSorted((a, b) => {
      if (!a.slotStart || !b.slotStart) return 0;
      return new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime();
    });
};

/** Get display label for a record type. */
export const getTypeLabel = (type: string) => {
  if (!type || type === 'All') return null;

  const types = type.split(',').map(t => t.trim());

  // map each to its display label
  const label = types.find(
    type =>
      (typeMappings as Record<string, { text: string; category: number }>)[type]
        ?.text
  );

  return (
    (typeMappings as Record<string, { text: string; category: number }>)[
      label ?? ''
    ]?.text ?? null
  );
};
