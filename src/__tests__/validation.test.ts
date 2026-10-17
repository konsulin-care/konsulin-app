import en from '@/messages/en/common.json';
import id from '@/messages/id/common.json';
import type { ValidationMessage } from '@/utils/validation';
import {
  getProfileValidationRules,
  validateEmailField,
  validateInput,
  validateName,
  validateRequiredText
} from '@/utils/validation';
import { describe, expect, it } from 'vitest';

/**
 * Resolve a dotted key against a parsed common.json namespace and
 * interpolate params, mirroring next-intl behavior for these messages.
 *
 * @param messages - Parsed common.json for one locale.
 * @param key - Dotted key without the `common.` prefix, e.g. `validation.email_required`.
 * @param params - Interpolation values, e.g. `{ label: 'First name' }`.
 * @returns The interpolated message string.
 */
function t(
  messages: Record<string, unknown>,
  key: string,
  params: Record<string, string> = {}
): string {
  const resolved: unknown = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined,
      messages
    );
  if (typeof resolved !== 'string') throw new Error(`Missing key: ${key}`);
  return resolved.replace(
    /\{(\w+)\}/g,
    (match, name: string) => params[name] ?? match
  );
}

/**
 * Assert a validation result is present and narrow it for further checks.
 *
 * @param message - Result of a validation helper.
 * @returns The non-null validation message.
 */
function expectMessage(message: ValidationMessage | null): ValidationMessage {
  if (message === null) throw new Error('Expected a validation message');
  return message;
}

/** Strip the `common.` namespace prefix from a validation key. */
function nsKey(message: ValidationMessage): string {
  return message.key.replace(/^common\./, '');
}

describe('validateName', () => {
  it('returns cannot_be_empty for blank values', () => {
    expect(validateName('', 'First name')).toEqual({
      key: 'common.validation.cannot_be_empty',
      params: { label: 'First name' }
    });
  });

  it('returns invalid_format for non alphabetic values', () => {
    expect(validateName('J0hn', 'First name')).toEqual({
      key: 'common.validation.invalid_format',
      params: { label: 'First name' }
    });
  });

  it('returns min_length for one-character values', () => {
    expect(validateName('J', 'First name')).toEqual({
      key: 'common.validation.min_length',
      params: { label: 'First name' }
    });
  });

  it('returns null for valid names', () => {
    expect(validateName('John', 'First name')).toBeNull();
  });
});

describe('validateEmailField', () => {
  it('returns email_required for blank values', () => {
    expect(validateEmailField('   ')).toEqual({
      key: 'common.validation.email_required'
    });
  });

  it('returns email_invalid for malformed values', () => {
    expect(validateEmailField('not-an-email')).toEqual({
      key: 'common.validation.email_invalid'
    });
  });

  it('returns null for valid values', () => {
    expect(validateEmailField('a@b.co')).toBeNull();
  });
});

describe('validateRequiredText', () => {
  it('returns cannot_be_empty with the field label', () => {
    expect(validateRequiredText(' ', 'City')).toEqual({
      key: 'common.validation.cannot_be_empty',
      params: { label: 'City' }
    });
  });

  it('returns null for non-blank values', () => {
    expect(validateRequiredText('Jakarta', 'City')).toBeNull();
  });
});

describe('profile validation rules', () => {
  it('requires a phone number for phone-based users', () => {
    const rules = getProfileValidationRules(true);
    expect(rules.phone('')).toEqual({
      key: 'common.validation.phone_required'
    });
  });

  it('rejects phone numbers outside 8-15 digits', () => {
    const rules = getProfileValidationRules(true);
    expect(rules.phone('123')).toEqual({
      key: 'common.validation.phone_invalid'
    });
    expect(rules.phone('081234567890')).toBeNull();
  });

  it('requires at least one non-blank address part', () => {
    const rules = getProfileValidationRules(false);
    expect(rules.addresses(['', ''])).toEqual({
      key: 'common.validation.address_required'
    });
    expect(rules.addresses(['Jl. Merdeka 1'])).toBeNull();
  });

  it('requires birth date and gender', () => {
    const rules = getProfileValidationRules(false);
    expect(rules.birthDate('')).toEqual({
      key: 'common.validation.birth_date_required'
    });
    expect(rules.gender('')).toEqual({
      key: 'common.validation.gender_required'
    });
    expect(rules.birthDate('2000-01-01')).toBeNull();
    expect(rules.gender('male')).toBeNull();
  });
});

describe('validateInput', () => {
  it('validates email only for phone-based users', () => {
    expect(validateInput('email', '', true)).toEqual({
      key: 'common.validation.email_required'
    });
    expect(validateInput('email', '', false)).toBeNull();
  });

  it('returns null for the phone field and unknown fields', () => {
    expect(validateInput('phone', '', true)).toBeNull();
    expect(validateInput('phone', '', false)).toBeNull();
    expect(validateInput('nickname', 'J', false)).toBeNull();
  });

  it('delegates to the matching profile rule', () => {
    expect(validateInput('firstName', '', false)).toEqual({
      key: 'common.validation.cannot_be_empty',
      params: { label: 'First name' }
    });
  });
});

describe('t() resolution for validation messages', () => {
  const messages: ValidationMessage[] = [
    expectMessage(validateName('', 'First name')),
    expectMessage(validateName('J0hn', 'First name')),
    expectMessage(validateName('J', 'First name')),
    expectMessage(validateEmailField('')),
    expectMessage(validateEmailField('not-an-email')),
    expectMessage(validateRequiredText(' ', 'City')),
    expectMessage(getProfileValidationRules(true).phone('')),
    expectMessage(getProfileValidationRules(true).phone('123')),
    expectMessage(getProfileValidationRules(false).addresses(['', ''])),
    expectMessage(getProfileValidationRules(false).birthDate('')),
    expectMessage(getProfileValidationRules(false).gender(''))
  ];

  it('resolves every returned key in both en and id without leftovers', () => {
    for (const message of messages) {
      for (const locale of [en, id]) {
        const output = t(locale, nsKey(message), message.params);
        expect(output).not.toContain('{');
        expect(output).not.toBe(nsKey(message));
      }
    }
  });

  it('renders the expected en and id sentences', () => {
    expect(t(en, 'validation.invalid_format', { label: 'First name' })).toBe(
      'First name format is invalid'
    );
    expect(t(id, 'validation.invalid_format', { label: 'First name' })).toBe(
      'Format First name tidak valid'
    );
    expect(t(en, 'validation.email_required')).toBe('Email is required');
    expect(t(id, 'validation.email_required')).toBe('Email wajib diisi');
    expect(t(en, 'validation.phone_invalid')).toBe(
      'WhatsApp phone number must be 8-15 digits'
    );
    expect(t(id, 'validation.phone_invalid')).toBe(
      'Nomor WhatsApp harus 8-15 digit'
    );
    expect(t(en, 'validation.address_required')).toBe(
      'Address cannot be empty'
    );
    expect(t(id, 'validation.address_required')).toBe(
      'Alamat tidak boleh kosong'
    );
    expect(t(en, 'validation.cannot_be_empty', { label: 'First name' })).toBe(
      'First name cannot be empty'
    );
    expect(t(id, 'validation.cannot_be_empty', { label: 'First name' })).toBe(
      'First name tidak boleh kosong'
    );
  });
});
