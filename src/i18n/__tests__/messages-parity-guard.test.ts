import { describe, expect, it } from 'vitest';
import {
  EN_DIR,
  ID_DIR,
  compareKeySets,
  flattenKeys,
  readMessages
} from './message-scanner';

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
    // skipcq: JS-0320 - intentional delete to build a broken fixture
    delete idBroken[firstTopLevelKey];

    const broken = compareKeySets(flattenKeys(enCommon), flattenKeys(idBroken));
    expect(removedLeaves.length).toBeGreaterThan(0);
    expect(broken.missingInId).toEqual(removedLeaves);
  });
});
