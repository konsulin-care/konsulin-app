import fs from 'node:fs';
import path from 'node:path';

// Vitest runs with the project root as cwd.
/** Absolute path to the English messages directory. */
export const EN_DIR = path.resolve(process.cwd(), 'src/messages/en');
/** Absolute path to the Indonesian messages directory. */
export const ID_DIR = path.resolve(process.cwd(), 'src/messages/id');

/**
 * List JSON namespace file names (without extension) in a messages directory.
 *
 * @param dir - Absolute path to a messages directory.
 * @returns Sorted namespace names.
 */
export function listNamespaces(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace(/\.json$/, ''))
    .sort();
}

/**
 * Read a namespace JSON file from a messages directory.
 *
 * @param dir - Absolute path to a messages directory.
 * @param namespace - Namespace file name without extension.
 * @returns Parsed message object.
 */
export function readMessages(
  dir: string,
  namespace: string
): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(dir, `${namespace}.json`), 'utf8')
  ) as Record<string, unknown>;
}

/**
 * Flatten a nested message object into dot-separated leaf key paths.
 * Arrays count as leaves, matching next-intl key resolution.
 *
 * @param messages - Parsed namespace message object.
 * @returns Dot-separated leaf key paths.
 */
export function flattenKeys(messages: Record<string, unknown>): Set<string> {
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

/**
 * Compare en and id flattened key sets.
 * Returns en keys absent from id and id keys absent from en, each sorted.
 *
 * @param enKeys - Flattened keys from the en namespace.
 * @param idKeys - Flattened keys from the id namespace.
 * @returns Missing-in-id and extra-in-id sorted key lists.
 */
export function compareKeySets(
  enKeys: Set<string>,
  idKeys: Set<string>
): { missingInId: string[]; extraInId: string[] } {
  return {
    missingInId: [...enKeys].filter(key => !idKeys.has(key)).sort(),
    extraInId: [...idKeys].filter(key => !enKeys.has(key)).sort()
  };
}
