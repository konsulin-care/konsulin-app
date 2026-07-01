import { dbGet, dbSet, STORES } from '@/lib/indexeddb';

const FHIR_ID_MAP_PREFIX = 'fhirId_map_';

/** Keys that could cause prototype pollution if used as dynamic object keys. */
const BANNED_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'toLocaleString',
  'isPrototypeOf',
  'propertyIsEnumerable'
]);

/** Check if a role key is safe to use as an object property. */
function isValidRoleKey(key: string): boolean {
  return !BANNED_KEYS.has(key) && !key.startsWith('__');
}

/** Build the compound key for a user's fhirId map in uiPreferences. */
function mapKey(userId: string): string {
  return `${FHIR_ID_MAP_PREFIX}${userId}`;
}

/** Read the full fhirId map for a user from IndexedDB. */
export async function getFhirIdMap(
  userId: string
): Promise<Record<string, string>> {
  const entry = await dbGet<{ value: Record<string, string> }>(
    STORES.uiPreferences,
    ['', mapKey(userId)]
  );
  return entry?.value ?? {};
}

/** Persist a full fhirId map for a user. */
export async function storeFhirIdMap(
  userId: string,
  map: Record<string, string>
): Promise<void> {
  await dbSet(STORES.uiPreferences, {
    ownerId: '',
    prefKey: mapKey(userId),
    value: map
  });
}

/** Store the fhirId for one role, preserving existing entries. */
export async function storeFhirIdForRole(
  userId: string,
  role: string,
  fhirId: string
): Promise<void> {
  const existing = await getFhirIdMap(userId);
  // Guard against prototype pollution — role keys must be safe.
  if (!Object.hasOwn(existing, role) && !isValidRoleKey(role)) {
    throw new TypeError(`Invalid role key: ${role}`);
  }
  existing[role] = fhirId;
  await storeFhirIdMap(userId, existing);
}

/** Look up the fhirId for a specific role. Returns undefined if unset. */
export async function getFhirIdForRole(
  userId: string,
  role: string
): Promise<string | undefined> {
  const map = await getFhirIdMap(userId);
  // Guard against prototype pollution — role keys must be safe.
  if (!Object.hasOwn(map, role) && !isValidRoleKey(role)) {
    throw new TypeError(`Invalid role key: ${role}`);
  }
  return map[role];
}
