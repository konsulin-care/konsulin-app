/**
 * Determines whether the "Next" button should be enabled on the title page.
 * Title and description must be non-empty after trimming and the participant
 * target must be a positive integer.
 *
 * @param title - Study title, may be empty or undefined
 * @param description - Study description, may be empty or undefined
 * @param target - Participant target, may be undefined
 * @returns True when the title page is complete and valid
 */
export function canAdvanceOnTitlePage(
  title: string | undefined,
  description: string | undefined,
  target: number | undefined
): boolean {
  return (
    Boolean(title?.trim()) &&
    Boolean(description?.trim()) &&
    typeof target === 'number' &&
    Number.isInteger(target) &&
    target > 0
  );
}
