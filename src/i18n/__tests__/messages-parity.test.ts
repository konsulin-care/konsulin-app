import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs with the project root as cwd.
const EN_DIR = path.resolve(process.cwd(), 'src/messages/en');
const ID_DIR = path.resolve(process.cwd(), 'src/messages/id');

/** List JSON namespace file names (without extension) in a messages directory. */
function listNamespaces(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace(/\.json$/, ''))
    .sort();
}

/** Read a namespace JSON file as an object. */
function readMessages(dir: string, namespace: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(dir, `${namespace}.json`), 'utf8')
  ) as Record<string, unknown>;
}

/**
 * Flatten a nested message object into dot-separated leaf key paths.
 * Arrays count as leaves.
 */
function flattenKeys(messages: Record<string, unknown>): Set<string> {
  const keys = new Set<string>();
  const walk = (prefix: string, value: Record<string, unknown>): void => {
    for (const [key, child] of Object.entries(value)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (
        child !== null &&
        typeof child === 'object' &&
        !Array.isArray(child)
      ) {
        walk(fullKey, child as Record<string, unknown>);
      } else {
        keys.add(fullKey);
      }
    }
  };
  walk('', messages);
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

  for (const namespace of enNamespaces) {
    it(`has identical key sets for "${namespace}"`, () => {
      if (!idNamespaces.includes(namespace)) {
        throw new Error(`Namespace "${namespace}" exists in en but not in id`);
      }
      const enKeys = flattenKeys(readMessages(EN_DIR, namespace));
      const idKeys = flattenKeys(readMessages(ID_DIR, namespace));

      const missingInId = [...enKeys].filter(key => !idKeys.has(key)).sort();
      const extraInId = [...idKeys].filter(key => !enKeys.has(key)).sort();

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
