import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs with the project root as cwd.
const EN_DIR = path.resolve(process.cwd(), 'src/messages/en');
const ID_DIR = path.resolve(process.cwd(), 'src/messages/id');

/**
 * Flatten a nested message object into dot-separated leaf key paths.
 * Arrays count as leaves, matching next-intl key resolution.
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

/** Read a namespace JSON file from a messages directory. */
function readMessages(dir: string, namespace: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(dir, `${namespace}.json`), 'utf8')
  ) as Record<string, unknown>;
}

/**
 * Compare en and id flattened key sets.
 * Returns en keys absent from id and id keys absent from en, each sorted.
 */
function compareKeySets(
  enKeys: Set<string>,
  idKeys: Set<string>
): { missingInId: string[]; extraInId: string[] } {
  return {
    missingInId: [...enKeys].filter(key => !idKeys.has(key)).sort(),
    extraInId: [...idKeys].filter(key => !enKeys.has(key)).sort()
  };
}

describe('locale parity guard detects divergence', () => {
  const enFixture: Record<string, unknown> = {
    greeting: { hello: 'Hello', bye: 'Bye' },
    count: '{n} items'
  };

  it('passes when en and id key sets match', () => {
    const idFixture: Record<string, unknown> = {
      greeting: { hello: 'Halo', bye: 'Dadah' },
      count: '{n} item'
    };

    const result = compareKeySets(
      flattenKeys(enFixture),
      flattenKeys(idFixture)
    );
    expect(result).toEqual({ missingInId: [], extraInId: [] });
  });

  it('fails when an en key has no id counterpart', () => {
    // id lacks the nested key greeting.bye.
    const idFixture: Record<string, unknown> = {
      greeting: { hello: 'Halo' },
      count: '{n} item'
    };

    const result = compareKeySets(
      flattenKeys(enFixture),
      flattenKeys(idFixture)
    );
    expect(result.missingInId).toEqual(['greeting.bye']);
    expect(result.extraInId).toEqual([]);
  });

  it('fails when an id key has no en counterpart', () => {
    // id adds a nested key greeting.farewell that en lacks.
    const idFixture: Record<string, unknown> = {
      greeting: { hello: 'Halo', bye: 'Dadah', farewell: 'Selamat tinggal' },
      count: '{n} item'
    };

    const result = compareKeySets(
      flattenKeys(enFixture),
      flattenKeys(idFixture)
    );
    expect(result.missingInId).toEqual([]);
    expect(result.extraInId).toEqual(['greeting.farewell']);
  });

  it('treats arrays as leaves so array-valued keys stay comparable', () => {
    const enArray: Record<string, unknown> = { options: ['a', 'b'] };
    const idArray: Record<string, unknown> = { options: ['x'] };

    const result = compareKeySets(flattenKeys(enArray), flattenKeys(idArray));
    expect(result).toEqual({ missingInId: [], extraInId: [] });
  });

  it('detects divergence inside the real common namespace', () => {
    const enCommon = readMessages(EN_DIR, 'common');
    const idCommon = readMessages(ID_DIR, 'common');

    const aligned = compareKeySets(
      flattenKeys(enCommon),
      flattenKeys(idCommon)
    );
    expect(aligned).toEqual({ missingInId: [], extraInId: [] });

    // Drop one id top-level key and confirm the guard reports its leaf keys.
    const firstTopLevelKey = Object.keys(idCommon)[0];
    const removedLeaves = [...flattenKeys(idCommon)]
      .filter(
        key =>
          key === firstTopLevelKey || key.startsWith(`${firstTopLevelKey}.`)
      )
      .sort();
    const idBroken: Record<string, unknown> = { ...idCommon };
    delete idBroken[firstTopLevelKey];

    const broken = compareKeySets(flattenKeys(enCommon), flattenKeys(idBroken));
    expect(removedLeaves.length).toBeGreaterThan(0);
    expect(broken.missingInId).toEqual(removedLeaves);
  });
});
