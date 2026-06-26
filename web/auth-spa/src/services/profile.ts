import type { Bundle, Patient, Person, Practitioner, Resource } from 'fhir/r4';

const API_BASE = '/proxy';

/** Generic API request helper for the auth SPA. */
async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Creates a FHIR profile (Patient or Practitioner) for a new user. */
export function createProfile({
  userId,
  email,
  phoneNumber,
  type
}: {
  userId: string;
  email: string;
  phoneNumber: string;
  type: string;
}): Promise<Patient | Practitioner> {
  const telecom: { system: string; use: string; value: string }[] = [];
  if (email?.trim())
    telecom.push({ system: 'email', use: 'home', value: email.trim() });
  if (phoneNumber?.trim())
    telecom.push({ system: 'phone', use: 'mobile', value: phoneNumber.trim() });

  const payload = {
    resourceType: type,
    active: true,
    identifier: [
      { system: 'https://login.konsulin.care/userid', value: userId }
    ],
    ...(telecom.length > 0 && { telecom })
  };

  return apiRequest<Patient | Practitioner>('POST', `/fhir/${type}`, payload);
}

const KNOWN_TYPES = /* #__PURE__ */ new Set([
  'Patient',
  'Practitioner',
  'Person'
]);

/** Narrow Resource to known FHIR profile types at runtime. */
function isKnownProfile(
  resource: Resource
): resource is Patient | Practitioner | Person {
  return KNOWN_TYPES.has(resource.resourceType);
}

/** Fetches a FHIR profile by SuperTokens userId identifier. */
export async function getProfileByIdentifier({
  userId,
  type
}: {
  userId: string;
  type: string;
}): Promise<Patient | Practitioner | Person | null> {
  const bundle = await apiRequest<Bundle>(
    'GET',
    `/fhir/${type}?identifier=https://login.konsulin.care/userid|${userId}`
  );
  const resource = bundle?.entry?.[0]?.resource;
  if (!resource || !isKnownProfile(resource)) {
    return null;
  }
  return resource;
}
