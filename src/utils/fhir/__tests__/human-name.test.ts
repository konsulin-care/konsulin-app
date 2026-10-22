import type { HumanName } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { buildHumanName, collapseHumanName } from '../human-name';

describe('collapseHumanName', () => {
  it('joins given names and family into "given family" format', () => {
    const name: HumanName = {
      use: 'official',
      given: ['John', 'Magnificent'],
      family: 'Doe'
    };
    expect(collapseHumanName(name)).toBe('John Magnificent Doe');
  });

  it('handles missing family', () => {
    const name: HumanName = { use: 'official', given: ['John'] };
    expect(collapseHumanName(name)).toBe('John');
  });

  it('handles missing given', () => {
    const name: HumanName = { use: 'official', family: 'Doe' };
    expect(collapseHumanName(name)).toBe('Doe');
  });

  it('returns empty string for undefined name', () => {
    const noName: HumanName | undefined = undefined;
    expect(collapseHumanName(noName)).toBe('');
  });

  it('returns empty string for empty name parts', () => {
    expect(collapseHumanName({})).toBe('');
  });
});

describe('buildHumanName', () => {
  it('builds an official HumanName with given and family', () => {
    expect(buildHumanName(['John', 'Magnificent'], 'Doe')).toEqual({
      use: 'official',
      given: ['John', 'Magnificent'],
      family: 'Doe'
    });
  });

  it('omits family when not provided', () => {
    expect(buildHumanName(['John'])).toEqual({
      use: 'official',
      given: ['John']
    });
  });
});

describe('round trip', () => {
  it('collapse then re-parse preserves given and family', () => {
    const name = buildHumanName(['John', 'Magnificent'], 'Doe');
    expect(collapseHumanName(name)).toBe('John Magnificent Doe');
  });
});
