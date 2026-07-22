import { describe, expect, it } from 'vitest';
import {
  mergeRecords,
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle
} from '../parse-searchset-bundles';

describe('parse-compartment-bundles (redirect)', () => {
  it('re-exports from parse-searchset-bundles', () => {
    expect(parseQRBundle).toBeDefined();
    expect(parseConditionBundle).toBeDefined();
    expect(parseObservationBundle).toBeDefined();
    expect(mergeRecords).toBeDefined();
  });
});
