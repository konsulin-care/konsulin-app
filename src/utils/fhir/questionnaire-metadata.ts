import type { Questionnaire } from 'fhir/r4';

/**
 * Set the publisher and date on a Questionnaire resource.
 *
 * Overwrites the publisher and date fields while preserving all other
 * fields on the resource.
 *
 * @param questionnaire - The Questionnaire resource to modify\n * @param publisher - Publisher name (e.g. the clinic Organization name)\n * @param date - ISO date the questionnaire was last changed\n * @returns A new Questionnaire object with publisher and date set\n */
export function setQuestionnairePublisherDate(
  questionnaire: Questionnaire,
  publisher: string,
  date: string
): Questionnaire {
  return { ...questionnaire, publisher, date };
}

/**
 * Append the current user's contact to a Questionnaire resource.
 *
 * Builds a contact entry from whichever of name, email, or phone are
 * present, and appends it to the existing contact array. Returns the
 * questionnaire unchanged when no contact fields are provided.
 *
 * @param questionnaire - The Questionnaire resource to modify
 * @param contact - Contact fields { name?, email?, phone? }
 * @returns A new Questionnaire object with the contact appended\n */
export function appendQuestionnaireContact(
  questionnaire: Questionnaire,
  contact: { name?: string; email?: string; phone?: string }
): Questionnaire {
  const { name, email, phone } = contact;
  if (!name && !email && !phone) return questionnaire;

  const telecom = [
    ...(email ? [{ system: 'email' as const, value: email }] : []),
    ...(phone ? [{ system: 'phone' as const, value: phone }] : [])
  ];

  return {
    ...questionnaire,
    contact: [
      ...(questionnaire.contact ?? []),
      {
        ...(name ? { name } : {}),
        ...(telecom.length > 0 ? { telecom } : {})
      }
    ]
  };
}
