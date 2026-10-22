/**
 * Determines whether the "Next" button should be enabled on the title page.
 * Both title and description must be non-empty after trimming.
 */
export function canAdvanceOnTitlePage(
  title: string | undefined,
  description: string | undefined
): boolean {
  return Boolean(title?.trim()) && Boolean(description?.trim());
}
