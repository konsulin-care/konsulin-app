/** Palette of deterministic colors for location dots. */
export const LOCATION_COLORS = [
  '#13C2C2',
  '#F5222D',
  '#1890FF',
  '#FA8C16',
  '#722ED1',
  '#52C41A',
  '#EB2F96',
  '#FADB14'
];

/**
 * Deterministically pick a color from a palette for a location ID.
 *
 * @param locationId - The FHIR Location id, or null for unspecified.
 * @returns A hex color string.
 */
export function getLocationColor(locationId: string | null): string {
  if (!locationId) return '#D9D9D9';
  let hash = 0;
  for (let i = 0; i < locationId.length; i++) {
    hash = (locationId.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  return LOCATION_COLORS[Math.abs(hash) % LOCATION_COLORS.length];
}
