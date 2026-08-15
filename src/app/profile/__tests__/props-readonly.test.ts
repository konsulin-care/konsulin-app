import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guard against SonarQube S6759: every destructured props annotation on the
 * profile components must be marked `Readonly`, so an accidental mutation of
 * the props type is caught at compile time and the security/quality gate
 * stays green.
 */

const NAMED_PROPS_FILES = [
  'src/components/profile/information-detail.tsx',
  'src/app/profile/extension-card.tsx',
  'src/app/profile/contact-edit-drawer.tsx',
  'src/app/profile/personal-info-edit-drawer.tsx',
  'src/components/profile/photo-uploader.tsx',
  'src/app/profile/name-edit-drawer.tsx',
  'src/app/profile/profile-identity.tsx',
  'src/app/profile/address-edit-drawer.tsx'
];

describe('profile component props are read-only', () => {
  it('marks named Props annotations as Readonly', async () => {
    for (const file of NAMED_PROPS_FILES) {
      // Fixed repo paths, never user input.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const src = await fs.promises.readFile(file, 'utf8');
      expect(src, file).toMatch(/}: Readonly<Props>\)/);
      expect(src, file).not.toMatch(/}: Props\)/);
    }
  });

  it('marks the inline props annotations in profile-display as Readonly', async () => {
    const src = await fs.promises.readFile(
      'src/app/profile/profile-display.tsx',
      'utf8'
    );
    expect(src).toMatch(/}: Readonly<\{/);
    expect(src).not.toMatch(/^}: \{/m);
  });
});
