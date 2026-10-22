import { expect } from 'vitest';

/** Runtime + type-level assertion that a value is non-null/non-undefined. */
export function assertDefined<T>(
  value: T | null | undefined
): asserts value is NonNullable<T> {
  expect(value).not.toBeNull();
  expect(value).not.toBeUndefined();
}
