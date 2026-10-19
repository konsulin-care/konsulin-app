import { describe, expect, it } from 'vitest';
import {
  EN_DIR,
  ID_DIR,
  compareKeySets,
  flattenKeys,
  listNamespaces,
  readMessages
} from './message-scanner';

describe('message parity between en and id', () => {
  const enNamespaces = listNamespaces(EN_DIR);
  const idNamespaces = listNamespaces(ID_DIR);

  it('has a matching namespace file in both locales', () => {
    const missingInId = enNamespaces.filter(ns => !idNamespaces.includes(ns));
    const missingInEn = idNamespaces.filter(ns => !enNamespaces.includes(ns));

    expect(
      missingInId,
      `Namespaces missing in src/messages/id: ${missingInId.join(', ')}`
    ).toEqual([]);
    expect(
      missingInEn,
      `Namespaces missing in src/messages/en: ${missingInEn.join(', ')}`
    ).toEqual([]);
  });

  it('has no namespace file without at least one locale file', () => {
    expect(enNamespaces.length).toBeGreaterThan(0);
  });

  for (const namespace of enNamespaces) {
    it(`has identical key sets for "${namespace}"`, () => {
      if (!idNamespaces.includes(namespace)) {
        throw new Error(`Namespace "${namespace}" exists in en but not in id`);
      }
      const { missingInId, extraInId } = compareKeySets(
        flattenKeys(readMessages(EN_DIR, namespace)),
        flattenKeys(readMessages(ID_DIR, namespace))
      );

      expect(
        missingInId,
        `Keys in en/${namespace}.json missing from id/${namespace}.json: ${missingInId.join(', ')}`
      ).toEqual([]);
      expect(
        extraInId,
        `Keys in id/${namespace}.json missing from en/${namespace}.json: ${extraInId.join(', ')}`
      ).toEqual([]);
    });
  }
});
