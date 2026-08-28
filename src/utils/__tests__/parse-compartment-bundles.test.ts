import { describe, expect, it } from 'vitest';
import {
  mergeRecords,
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle
} from '../parse-compartment-bundles';

describe('parse-compartment-bundles (deprecated redirect)', () => {
  it('re-exports from fhir/searchset-bundle via parse-searchset-bundles shim', () => {
    expect(parseQRBundle).toBeDefined();
    expect(parseConditionBundle).toBeDefined();
    expect(parseObservationBundle).toBeDefined();
    expect(mergeRecords).toBeDefined();
  });
});
