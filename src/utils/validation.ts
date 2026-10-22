/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, security/detect-unsafe-regex */

/** Message key plus interpolation params returned by validation helpers. */
export interface ValidationMessage {
  /** Full i18n key, e.g. `common.validation.email_required`. */
  key: string;
  /** Interpolation params for the message, e.g. the field label. */
  params?: Record<string, string>;
}

/**
 * Validates a person name.
 *
 * @param value - Candidate name value.
 * @param label - Field label interpolated into the message.
 * @returns Message key with params, or null when valid.
 */
export function validateName(
  value: string,
  label: string
): ValidationMessage | null {
  const regex = /^[a-zA-Z ]+$/;
  if (!value) {
    return { key: 'common.validation.cannot_be_empty', params: { label } };
  }
  if (!regex.test(value)) {
    return { key: 'common.validation.invalid_format', params: { label } };
  }
  if (value.length < 2) {
    return { key: 'common.validation.min_length', params: { label } };
  }
  return null;
}

/**
 * Validates an email field value.
 *
 * @param value - Candidate email value.
 * @returns Message key, or null when valid.
 */
export function validateEmailField(value: string): ValidationMessage | null {
  if (!value || value.trim() === '') {
    return { key: 'common.validation.email_required' };
  }
  if (!validateEmail(value)) {
    return { key: 'common.validation.email_invalid' };
  }
  return null;
}

/**
 * Validates that a text field is not blank.
 *
 * @param value - Candidate text value.
 * @param label - Field label interpolated into the message.
 * @returns Message key with params, or null when valid.
 */
export function validateRequiredText(
  value: string,
  label: string
): ValidationMessage | null {
  if (!value.trim()) {
    return { key: 'common.validation.cannot_be_empty', params: { label } };
  }
  return null;
}

/**
 * Profile form validation rules. Each rule returns a message key with
 * params (or null when valid); call sites translate via t().
 *
 * @param isPhoneBasedUser - Whether the user logs in with a phone number.
 * @returns Map of field name to validation rule.
 */
export function getProfileValidationRules(isPhoneBasedUser: boolean) {
  return {
    firstName: (v: string) => validateName(v, 'First name'),
    lastName: (v: string) =>
      v && v.trim() !== '' ? validateName(v, 'Last name') : null,
    email: (v: string) => (isPhoneBasedUser ? validateEmailField(v) : null),
    phone: (value: string) => {
      if (!isPhoneBasedUser) return null;
      const phoneRegex = /^\+?\d{8,15}$/;
      if (!value || value.trim() === '') {
        return { key: 'common.validation.phone_required' };
      }
      if (!phoneRegex.test(value)) {
        return { key: 'common.validation.phone_invalid' };
      }
      return null;
    },
    addresses: (value: string | string[]) =>
      !Array.isArray(value) || value.every(part => !part.trim())
        ? { key: 'common.validation.address_required' }
        : null,
    city: (v: string) => validateRequiredText(v, 'City'),
    district: (v: string) => validateRequiredText(v, 'District'),
    province: (v: string) => validateRequiredText(v, 'Province'),
    postalCode: (v: string) => validateRequiredText(v, 'Postal code'),
    birthDate: (value: string) =>
      value ? null : { key: 'common.validation.birth_date_required' },
    gender: (value: string) =>
      value ? null : { key: 'common.validation.gender_required' }
  } as const;
}

/**
 * Runs the profile rule for a single field.
 *
 * @param name - Field name to look up in the profile rules.
 * @param value - Field value to validate.
 * @param isPhoneBasedUser - Whether the user logs in with a phone number.
 * @returns Message key with params, or null when valid or unknown.
 */
export function validateInput(
  name: string,
  value: string,
  isPhoneBasedUser: boolean
): ValidationMessage | null {
  if (name === 'email' && !isPhoneBasedUser) return null;
  if (name === 'phone' && isPhoneBasedUser) return null;
  const rules = new Map(
    Object.entries(getProfileValidationRules(isPhoneBasedUser))
  );
  const fn = rules.get(name);
  if (!fn) return null;
  return fn(value) ?? null;
}

/**
 * Validates every field of a form payload.
 *
 * @param data - Form values keyed by field name.
 * @param isPhoneBasedUser - Whether the user logs in with a phone number.
 * @returns True when every field passes its rule.
 */
export function validateForm(
  data: Record<string, unknown>,
  isPhoneBasedUser: boolean
): boolean {
  return Object.entries(data).every(([key, value]) => {
    if (key === 'email' && !isPhoneBasedUser) return true;
    if (key === 'phone' && isPhoneBasedUser) return true;
    const error = validateInput(key, value as string, isPhoneBasedUser);
    return !error;
  });
}

/**
 *
 */
export function validateEmail(value: string) {
  return /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/.test(
    value
  );
}

/**
 *
 */
export function alphaNumeric(value: string) {
  return /^[a-zA-Z0-9]+$/.test(value);
}

/**
 *
 */
export function upperCaseOneCharacter(value: string) {
  return /[A-Z]/.test(value);
}

/**
 *
 */
export function specialCharacter(value: string) {
  return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);
}

/**
 *
 */
export function capitalizeFirstLetter(str) {
  return str.replace(/^\w/, (c: string) => c.toUpperCase());
}

/**
 *
 */
export function formatLabel(label: string) {
  return label
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char: string) => char.toUpperCase()); // Capitalize the first letter of each word
}

/**
 *
 */
export function convertCurrencyStringToNumber(currencyString: string) {
  const numberString = currencyString.replace(/\D/g, '');
  return Number.parseInt(numberString, 10);
}

/**
 *
 */
export function formatCurrency(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const numberValue = Number.parseInt(value.replace(/\D/g, ''), 10);

  if (isNaN(numberValue)) {
    return '';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(numberValue);
}
