import enCommon from '@/messages/en/common.json';
import idCommon from '@/messages/id/common.json';
import { describe, expect, it } from 'vitest';
import { typeMappings } from '../record';

/** Resolves a dotted key such as "record.record_type.assessment". */
function resolve(messages: unknown, dottedKey: string): string | undefined {
  const found = dottedKey
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      messages
    );
  return typeof found === 'string' ? found : undefined;
}

describe('typeMappings', () => {
  it('maps PractitionerNote to "Practitioner Note"', () => {
    expect(typeMappings.PractitionerNote.text).toBe('Practitioner Note');
  });

  it('maps SOAP Notes to "SOAP"', () => {
    expect(typeMappings['SOAP Notes'].text).toBe('SOAP');
  });

  it('has a labelKey for every record type that resolves in en and id', () => {
    for (const mapping of Object.values(typeMappings)) {
      expect(resolve(enCommon, mapping.labelKey)).toBeTruthy();
      expect(resolve(idCommon, mapping.labelKey)).toBeTruthy();
    }
  });

  it('resolves distinct Indonesian record type labels', () => {
    expect(resolve(idCommon, typeMappings.PatientNote.labelKey)).toBe(
      'Jurnal Pribadi'
    );
    expect(resolve(enCommon, typeMappings.PatientNote.labelKey)).toBe(
      'Self Journal'
    );
  });
});
