import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { cwd } from 'node:process';

const CONFIG_PATH = resolve(cwd(), '.deepsource.toml');

describe('.deepsource.toml', () => {
  it('marks test files with test_patterns so JS-0323 any is suppressed', () => {
    const content = readFileSync(CONFIG_PATH, 'utf8');

    // Root-level test_patterns block exists
    expect(content).toContain('test_patterns');

    // Covers Vitest test directories and file patterns
    expect(content).toContain('**/__tests__/**');
    expect(content).toContain('**/*.test.*');
    expect(content).toContain('**/*.spec.*');
  });
});
