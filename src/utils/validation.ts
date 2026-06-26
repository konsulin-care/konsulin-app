/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, security/detect-unsafe-regex */
/**
 *
 */
export function validateName(value: string, label: string): string {
  const regex = /^[a-zA-Z ]+$/;
  if (!value) return `${label} cannot be empty`;
  if (!regex.test(value)) return `${label} format is invalid`;
  if (value.length < 2) return `${label} must be at least two characters`;
  return '';
}

/**
 *
 */
export function validateEmailField(value: string): string {
  if (!value || value.trim() === '') return 'Email is required';
  if (!validateEmail(value)) return 'Email format is invalid';
  return '';
}

/**
 *
 */
export function validateRequiredText(value: string, label: string): string {
  if (!value.trim()) return `${label} cannot be empty`;
  return '';
}

/**
 *
 */
export function getProfileValidationRules(isPhoneBasedUser: boolean) {
  return {
    firstName: (v: string) => validateName(v, 'First name'),
    lastName: (v: string) =>
      v && v.trim() !== '' ? validateName(v, 'Last name') : '',
    email: (v: string) => (isPhoneBasedUser ? validateEmailField(v) : ''),
    phone: (value: string) => {
      if (!isPhoneBasedUser) return '';
      const phoneRegex = /^\+?\d{8,15}$/;
      if (!value || value.trim() === '') return 'Phone number is required';
      if (!phoneRegex.test(value))
        return 'WhatsApp phone number must be 8-15 digits';
      return '';
    },
    addresses: (value: string | string[]) =>
      !Array.isArray(value) || value.every(part => !part.trim())
        ? 'Address cannot be empty'
        : '',
    city: (v: string) => validateRequiredText(v, 'City'),
    district: (v: string) => validateRequiredText(v, 'District'),
    province: (v: string) => validateRequiredText(v, 'Province'),
    postalCode: (v: string) => validateRequiredText(v, 'Postal code'),
    birthDate: (value: string) => (value ? '' : 'Birth date cannot be empty'),
    gender: (value: string) => (value ? '' : 'Gender cannot be empty')
  } as const;
}

/**
 *
 */
export function validateInput(
  name: string,
  value: string,
  isPhoneBasedUser: boolean
): string {
  if (name === 'email' && !isPhoneBasedUser) return '';
  if (name === 'phone' && isPhoneBasedUser) return '';
  const rules = new Map(
    Object.entries(getProfileValidationRules(isPhoneBasedUser))
  );
  const fn = rules.get(name);
  if (!fn) return '';
  return fn(value) ?? '';
}

/**
 *
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
