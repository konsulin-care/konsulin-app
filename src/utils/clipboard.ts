/**
 * Async function to copy a string to the system clipboard.
 *
 * Thin wrapper around `navigator.clipboard.writeText` so components
 * don't depend on the browser API directly, making the operation
 * mockable in tests.
 */
export async function writeClipboard(value: string): Promise<void> {
  return navigator.clipboard.writeText(value);
}
