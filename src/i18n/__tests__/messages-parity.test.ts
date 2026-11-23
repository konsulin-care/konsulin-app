import { ASSESSMENT_CATEGORY_CODES } from '@/constants/assessment-categories';
import { describe, expect, it } from 'vitest';
import {
  EN_DIR,
  ID_DIR,
  compareKeySets,
  flattenKeys,
  listNamespaces,
  readMessages
} from './message-scanner';

/**
 * Collect every object key at any depth of a parsed message namespace.
 *
 * @param value - Parsed message object.
 * @returns All keys encountered while walking the object.
 */
function collectKeys(value: Record<string, unknown>): string[] {
  const keys: string[] = [];
  const walk = (node: Record<string, unknown>): void => {
    for (const [key, child] of Object.entries(node)) {
      keys.push(key);
      if (
        child !== null &&
        typeof child === 'object' &&
        !Array.isArray(child)
      ) {
        walk(child as Record<string, unknown>);
      }
    }
  };
  walk(value);
  return keys;
}

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

  it.each([
    ['en', EN_DIR],
    ['id', ID_DIR]
  ])('has no dotted keys in the %s assessment namespace', (_locale, dir) => {
    const keys = collectKeys(readMessages(dir, 'assessment'));
    const dottedKeys = keys.filter(key => key.includes('.'));

    expect(
      dottedKeys,
      `Dotted keys are rejected by next-intl: ${dottedKeys.join(', ')}`
    ).toEqual([]);
  });

  it.each([
    ['en', EN_DIR],
    ['id', ID_DIR]
  ])('resolves every assessment category code in %s', (_locale, dir) => {
    const messages = readMessages(dir, 'assessment');
    const category = messages.category as Record<string, unknown> | undefined;

    expect(category, 'Missing nested category object').toBeDefined();
    for (const code of ASSESSMENT_CATEGORY_CODES) {
      expect(category?.[code], `Missing label for category.${code}`).toEqual(
        expect.any(String)
      );
    }
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
