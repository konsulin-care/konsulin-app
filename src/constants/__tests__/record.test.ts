import { describe, expect, it } from 'vitest';
import { typeMappings } from '../record';

describe('typeMappings', () => {
  it('maps PractitionerNote to "Practitioner Note"', () => {
    expect(typeMappings.PractitionerNote.text).toBe('Practitioner Note');
  });

  it('maps SOAP Notes to "SOAP"', () => {
    expect(typeMappings['SOAP Notes'].text).toBe('SOAP');
  });
});
