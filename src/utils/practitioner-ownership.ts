const STORAGE_KEY = 'practitioner_role_ids';

/**
 * Save the current user's owned PractitionerRole IDs to localStorage.
 * Called on successful fetch of practitioner's own roles.
 */
export function storeOwnedRoleIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/**
 * Retrieve the stored PractitionerRole IDs from localStorage.
 * Returns empty array if nothing stored or data is malformed.
 */
export function getOwnedRoleIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Remove stored PractitionerRole IDs from localStorage.
 * Call on logout.
 */
export function clearOwnedRoleIds(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check whether a given PractitionerRole ID belongs to the current user.
 */
export function isOwnedRole(id: string): boolean {
  return getOwnedRoleIds().includes(id);
}
