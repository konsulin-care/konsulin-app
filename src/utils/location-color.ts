/** Colour for appointments without a location reference. */
export const UNSPECIFIED_LOCATION_COLOR = '#D9D9D9';

/**
 * Avatar fallback fill. Seeded SVG avatars are data, not theme tokens, so this
 * intentionally stays a literal hex value shared with the location palette.
 */
export const AVATAR_FALLBACK_COLOR = '#13c2c2';

/** Palette of deterministic colors for location dots. */
export const LOCATION_COLORS = [
  AVATAR_FALLBACK_COLOR,
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
  if (!locationId) return UNSPECIFIED_LOCATION_COLOR;
  let hash = 0;
  for (let i = 0; i < locationId.length; i++) {
    hash = (locationId.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  return LOCATION_COLORS[Math.abs(hash) % LOCATION_COLORS.length];
}
