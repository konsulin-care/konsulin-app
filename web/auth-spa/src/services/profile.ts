import type { Bundle, Patient, Practitioner } from 'fhir/r4';

const API_BASE = '/proxy';

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function createProfile({
  userId,
  email,
  phoneNumber,
  type,
}: {
  userId: string;
  email: string;
  phoneNumber: string;
  type: string;
}): Promise<Patient | Practitioner> {
  const telecom: { system: string; use: string; value: string }[] = [];
  if (email?.trim()) telecom.push({ system: 'email', use: 'home', value: email.trim() });
  if (phoneNumber?.trim()) telecom.push({ system: 'phone', use: 'mobile', value: phoneNumber.trim() });

  const payload = {
    resourceType: type,
    active: true,
    identifier: [{ system: 'https://login.konsulin.care/userid', value: userId }],
    ...(telecom.length > 0 && { telecom }),
  };

  return apiRequest<Patient | Practitioner>('POST', `/fhir/${type}`, payload);
}

export async function getProfileByIdentifier({
  userId,
  type,
}: {
  userId: string;
  type: string;
}): Promise<Patient | Practitioner | null> {
  const bundle = await apiRequest<Bundle>(
    'GET',
    `/fhir/${type}?identifier=https://login.konsulin.care/userid|${userId}`,
  );
  const entry = bundle?.entry?.[0]?.resource;
  return (entry as Patient | Practitioner) ?? null;
}
