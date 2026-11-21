import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const req = createRequire(import.meta.url);
const ROOT_PACKAGE_JSON = path.resolve(
  import.meta.dirname,
  '../../package.json'
);
const RENDERER_PACKAGE_JSON = path.resolve(
  import.meta.dirname,
  '../../node_modules/@aehrc/smart-forms-renderer/package.json'
);

interface RootPackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Read the root package.json manifest.
 *
 * @returns The parsed root package manifest.
 */
function readRootManifest(): RootPackageManifest {
  const contents = readFileSync(ROOT_PACKAGE_JSON, 'utf8');
  return JSON.parse(contents) as RootPackageManifest;
}

describe('single @mui/material copy', () => {
  it('resolves @mui/material to the same package.json from the app and the renderer', () => {
    const app = req.resolve('@mui/material/package.json');
    const rendererRequire = createRequire(RENDERER_PACKAGE_JSON);
    const fromRenderer = rendererRequire.resolve('@mui/material/package.json');

    expect(realpathSync(fromRenderer)).toBe(realpathSync(app));
  });

  it('does not declare @mui/material in package.json', () => {
    const manifest = readRootManifest();

    expect(manifest.dependencies ?? {}).not.toHaveProperty('@mui/material');
    expect(manifest.devDependencies ?? {}).not.toHaveProperty('@mui/material');
  });
});
