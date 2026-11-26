/** Values the title step contributes to the advance decision. */
export interface TitlePageValues {
  title: string | undefined;
  description: string | undefined;
  target: number | undefined;
  question: string | undefined;
  ethicsStatus: string | undefined;
}

/** True when the value is a whole number of at least one. */
function isPositiveInteger(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Determines whether the "Next" button should be enabled on the title page.
 * Title, description, research question and ethics status must be non-empty
 * after trimming and the participant target must be a positive integer.
 *
 * @param values - the title step values
 * @returns True when the title page is complete and valid
 */
export function canAdvanceOnTitlePage(values: TitlePageValues): boolean {
  const { title, description, target, question, ethicsStatus } = values;
  return (
    Boolean(title?.trim()) &&
    Boolean(description?.trim()) &&
    Boolean(question?.trim()) &&
    Boolean(ethicsStatus?.trim()) &&
    isPositiveInteger(target)
  );
}
