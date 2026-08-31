/**
 * Drawer copy for the questionnaire submission flow.
 *
 * Mid-batch messages keep the user motivated while more questionnaires remain
 * in the current batch; the final message confirms batch completion. All copy
 * is English to match the research flow.
 */

/** A title/body pair rendered in the submission drawer. */
export interface DrawerCopy {
  /** Drawer title (e.g., an uplifting headline). */
  title: string;
  /** Drawer body, possibly with {completed}/{total} placeholders. */
  body: string;
}

/**
 * Mid-batch motivational variations shown while questionnaires remain in the
 * current batch. Bodies carry {completed}/{total} placeholders interpolated
 * via fillProgress.
 */
export const MID_BATCH_MESSAGES: readonly DrawerCopy[] = [
  {
    title: 'Great progress!',
    body: "You've completed {completed} of {total} assessments in this batch. Every response counts toward the research, so keep going."
  },
  {
    title: "You're on a roll!",
    body: '{completed} of {total} done. Each assessment brings us closer to better mental health support.'
  },
  {
    title: 'Nice momentum!',
    body: '{completed} of {total} assessments complete. Your participation is making a real difference.'
  },
  {
    title: 'Keep it up!',
    body: '{completed} of {total} done in this batch. Every answer helps shape better care for everyone.'
  },
  {
    title: 'One step closer!',
    body: "{completed} of {total} complete. Thank you for sticking with the research, so we're nearly there."
  }
];

/** Dedicated message for the last remaining questionnaire in a batch. */
export const LAST_MID_BATCH_MESSAGE: DrawerCopy = {
  title: 'Almost there!',
  body: "Just one assessment left in this batch. You've got this!"
};

/** Count-less fallback for when batch progress is unavailable. */
export const MID_BATCH_FALLBACK_MESSAGE: DrawerCopy = {
  title: "You're doing great!",
  body: 'Every response counts toward the research, so keep going.'
};

/** Confirmation shown when the whole batch is complete. */
export const FINAL_BATCH_MESSAGE: DrawerCopy = {
  title: "You've completed this batch!",
  body: "That's every assessment in this batch. Thank you for participating, your responses help improve mental health care for everyone."
};

/** Completion message for a standalone (non-research) test. */
export const STANDALONE_MESSAGE: DrawerCopy = {
  title: "You've completed the test!",
  body: 'Your results will give you valuable insight into your mental health.'
};

/** Completion message for a research questionnaire outside a batch. */
export const STANDALONE_RESEARCH_MESSAGE: DrawerCopy = {
  title: 'Thank you for completing this assessment!',
  body: 'Your response helps improve mental health care for everyone.'
};

/**
 * Replaces the {completed}/{total} placeholders in a copy body.
 *
 * @param body - Template body containing the placeholders.
 * @param completed - Number of completed assessments.
 * @param total - Total assessments in the batch.
 * @returns The body with placeholders interpolated.
 */
export function fillProgress(
  body: string,
  completed: number,
  total: number
): string {
  return body
    .replaceAll('{completed}', String(completed))
    .replaceAll('{total}', String(total));
}
