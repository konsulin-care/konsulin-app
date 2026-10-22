/**
 * Extracts initials from a name string, skipping honorifics like "dr."
 *
 * @param name - Full name string
 * @returns Uppercase initials (1-2 characters)
 */
export function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  const meaningful = parts.filter(p => !/^dr\.?$/i.test(p));
  if (meaningful.length >= 2) {
    return (meaningful[0][0] + meaningful.at(-1)[0]).toUpperCase();
  }
  if (meaningful.length === 1) {
    return meaningful[0].slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
