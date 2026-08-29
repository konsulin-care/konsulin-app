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

/**
 * Safely read a role key from a record, guarding against prototype pollution.
 *
 * Banned keys (`__proto__`, `constructor`, ...) only resolve when they
 * already exist as own properties, preserving backward compatibility with
 * stored data. A banned key that is absent raises a TypeError, matching the
 * corrupt-session posture of the profile save path.
 *
 * @param map - The role-keyed record (may be undefined).
 * @param role - The role name to read.
 * @returns The stored value, or undefined when the key or map is missing.
 */
export function getRoleValue<V>(
  map: Record<string, V> | undefined,
  role: string
): V | undefined {
  if (!map) return undefined;
  // Allow banned keys that already exist (backward compat for stored data).
  if (!Object.hasOwn(map, role) && !isValidRoleKey(role)) {
    throw new TypeError(`Invalid role key: ${role}`);
  }
  // Reflect access avoids the security/detect-object-injection sink; guarded above.
  return Reflect.get(map, role);
}

/**
 * Safely set a role key in a record, guarding against prototype pollution.
 *
 * Banned keys (`__proto__`, `constructor`, ...) may only be overwritten
 * when they already exist as own properties; setting an absent banned key
 * raises a TypeError.
 *
 * @param map - The role-keyed record to write into.
 * @param role - The role name to write.
 * @param value - The value to store under the role.
 */
export function setRoleValue<V>(
  map: Record<string, V>,
  role: string,
  value: V
): void {
  // Allow overwriting banned keys that already exist.
  if (!Object.hasOwn(map, role) && !isValidRoleKey(role)) {
    throw new TypeError(`Invalid role key: ${role}`);
  }
  // Reflect access avoids the security/detect-object-injection sink; guarded above.
  Reflect.set(map, role, value);
}
