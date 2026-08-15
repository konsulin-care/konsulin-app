/* eslint-disable security/detect-non-literal-fs-filename */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Helper: read a file as utf8 and split into lines. */
function readFile(file: string): { content: string; lines: string[] } {
  const content = readFileSync(file, 'utf8');
  return { content, lines: content.split('\n') };
}

/**
 * Patterns that Codacy flags but ESLint doesn't catch because the
 * corresponding rules are deliberately disabled in eslint.config.cjs.
 *
 * These tests document the zero-tolerance policy for these patterns
 * in the source code to keep the Codacy dashboard clean.
 */

describe('Codacy-style patterns (enforced beyond ESLint)', () => {
  describe('service-form-drawer.tsx', () => {
    const { content } = readFile(
      'src/app/practitioner/service-form-drawer.tsx'
    );

    it('no void-returning arrow shorthands in JSX onChange handlers', () => {
      expect(content).not.toContain(
        'onChange={e => onNameChange(e.target.value)}'
      );
      expect(content).not.toContain(
        'onChange={e => onExtraDetailsChange(e.target.value)}'
      );
    });
  });

  describe('services-tab.tsx', () => {
    const { content } = readFile('src/app/practitioner/services-tab.tsx');

    it('removes redundant !localServices null check', () => {
      expect(content).not.toContain(
        '!localServices || localServices.length === 0'
      );
    });

    it('uses braces in onClick for handleEditService', () => {
      expect(content).not.toContain('onClick={() => handleEditService(svc)}');
    });

    it('uses braces in onClick for handleDeleteService', () => {
      expect(content).not.toContain(
        'onClick={() => handleDeleteService(svc.id)}'
      );
    });
  });

  describe('add-location-drawer.tsx', () => {
    const { content } = readFile('src/components/add-location-drawer.tsx');

    it('uses braces in onChange for setName, setLongitude, setLatitude', () => {
      expect(content).not.toContain('onChange={e => setName(e.target.value)}');
      expect(content).not.toContain(
        'onChange={e => setLongitude(e.target.value)}'
      );
      expect(content).not.toContain(
        'onChange={e => setLatitude(e.target.value)}'
      );
    });
  });

  describe('practitioner-card.tsx', () => {
    const { content, lines } = readFile(
      'src/components/practitioner/practitioner-card.tsx'
    );

    it('renames children variable to avoid React shadowing', () => {
      const childrenVar = lines.findIndex(
        l => l.includes('const children') && l.includes('el.children')
      );
      expect(childrenVar).toBe(-1);
    });

    it('renames items to childElements for overflow measurement', () => {
      const itemsVar = lines.findIndex(
        l => l.includes('const items') && l.includes('el.children')
      );
      expect(itemsVar).toBe(-1);
    });

    it('uses braces in useEffect cleanup for observer.disconnect', () => {
      const lineNo = lines.findIndex(
        l =>
          l.trim().startsWith('return') &&
          l.includes('observer.disconnect()') &&
          !l.includes('{')
      );
      expect(lineNo).toBe(-1);
    });

    it('uses braces in onError for Image', () => {
      expect(content).not.toContain('onError={() => setImgError(true)}');
    });
  });

  describe('register-practitioner-drawer.tsx', () => {
    const { content } = readFile(
      'src/components/register-practitioner-drawer.tsx'
    );

    it('uses braces in onChange for setName and setEmail', () => {
      expect(content).not.toContain('onChange={e => setName(e.target.value)}');
      expect(content).not.toContain('onChange={e => setEmail(e.target.value)}');
    });
  });

  describe('schedule-page-shell.tsx', () => {
    const { content, lines } = readFile(
      'src/components/shared/schedule-page-shell.tsx'
    );

    it('removes redundant hasMore check in IntersectionObserver callback', () => {
      expect(content).not.toContain('isIntersecting && hasMore &&');
    });

    it('uses braces in useEffect cleanup for observer.disconnect', () => {
      const lineNo = lines.findIndex(
        l =>
          l.trim().startsWith('return') &&
          l.includes('observer.disconnect()') &&
          !l.includes('{')
      );
      expect(lineNo).toBe(-1);
    });
  });

  describe('internal/handler/role_switcher.go', () => {
    const { lines } = readFile('internal/handler/role_switcher.go');

    it('nolint suppresses SSRF for BackendBaseURL request', () => {
      // Find the URL construction line (last occurrence of BackendBaseURL).
      const urlIdx = lines.findLastIndex(
        l => l.includes('BackendBaseURL') && l.includes('/api/v1/')
      );
      expect(urlIdx).toBeGreaterThanOrEqual(0);
      // The //nolint:gosec comment should be on the line immediately before.
      const nolintLine = lines[urlIdx - 1];
      expect(nolintLine).toContain('nolint:gosec');
    });
  });

  describe('services-tab.tsx (bracket-notation)', () => {
    const { content } = readFile('src/app/practitioner/services-tab.tsx');

    it('uses .at() instead of bracket notation for fetchedServices[i]', () => {
      // Line 58 originally: const f = fetchedServices[i];
      expect(content).not.toContain('fetchedServices[i]');
    });

    it('uses .with() or .splice() instead of bracket notation for updated[existingIdx]', () => {
      // Line 95 originally: updated[existingIdx] = serviceWithId;
      expect(content).not.toContain('updated[existingIdx]');
    });
  });

  describe('fhirIdMap.ts', () => {
    const { lines } = readFile('src/context/auth/fhirIdMap.ts');

    it('uses setRoleValue helper for dynamic property writes', () => {
      const writeIdx = lines.findIndex(l =>
        l.includes('setRoleValue(existing, role, fhirId)')
      );
      expect(writeIdx).toBeGreaterThanOrEqual(0);
    });

    it('uses getRoleValue helper for dynamic property reads', () => {
      const readIdx = lines.findIndex(l =>
        l.includes('getRoleValue(map, role)')
      );
      expect(readIdx).toBeGreaterThanOrEqual(0);
    });

    it('getRoleValue guards with Object.hasOwn + isValidRoleKey before property access', () => {
      const fnStart = lines.findIndex(l => l.includes('function getRoleValue'));
      expect(fnStart).toBeGreaterThanOrEqual(0);
      const body = lines.slice(fnStart, fnStart + 12);
      expect(body.some(l => l.includes('Object.hasOwn'))).toBe(true);
      expect(body.some(l => l.includes('isValidRoleKey(role)'))).toBe(true);
      expect(body.some(l => l.includes('return map[role]'))).toBe(true);
    });

    it('setRoleValue guards with Object.hasOwn + isValidRoleKey before property write', () => {
      const fnStart = lines.findIndex(l => l.includes('function setRoleValue'));
      expect(fnStart).toBeGreaterThanOrEqual(0);
      const body = lines.slice(fnStart, fnStart + 12);
      expect(body.some(l => l.includes('Object.hasOwn'))).toBe(true);
      expect(body.some(l => l.includes('isValidRoleKey(role)'))).toBe(true);
      expect(body.some(l => l.includes('map[role] = value'))).toBe(true);
    });

    it('no direct dynamic property write in exported functions', () => {
      const writeIdx = lines.findIndex(
        l => l.includes('existing[') && l.includes('] = fhirId')
      );
      expect(writeIdx).toBe(-1);
    });

    it('no direct dynamic property read in exported functions', () => {
      // Private helpers may use map[role] — only check exported function bodies.
      const exportStart = lines.findIndex(l =>
        l.includes('export async function storeFhirIdForRole')
      );
      expect(exportStart).toBeGreaterThanOrEqual(0);
      // From the first exported function onward, there should be no 'return map['.
      const exportedLines = lines.slice(exportStart);
      const readIdx = exportedLines.findIndex(l => l.includes('return map['));
      expect(readIdx).toBe(-1);
    });
  });

  describe('profile edit drawers (void-expression)', () => {
    const drawerFiles = [
      'src/app/profile/address-edit-drawer.tsx',
      'src/app/profile/contact-edit-drawer.tsx',
      'src/app/profile/name-edit-drawer.tsx',
      'src/app/profile/personal-info-edit-drawer.tsx'
    ];

    it.each(drawerFiles)(
      '%s passes handleSave directly to onCtaClick',
      file => {
        const { content } = readFile(file);
        expect(content).toContain('onCtaClick={handleSave}');
        expect(content).not.toContain('onCtaClick={() => handleSave()}');
      }
    );

    it.each(drawerFiles)('%s avoids void-returning arrow shorthands', file => {
      const { content } = readFile(file);
      expect(content).not.toMatch(/=>\s*\w+\(event\.target\.value\)/);
      expect(content).not.toMatch(/=>\s*handleSave\(\)/);
    });
  });

  describe('multi-role-sync.ts (role-keyed maps)', () => {
    const { content } = readFile('src/app/profile/multi-role-sync.ts');

    it('uses getRoleValue for dynamic property reads', () => {
      expect(content).toContain('getRoleValue(userInfo?.roleProfiles, role)');
      expect(content).toContain('getRoleValue(resources, activeRole)');
    });

    it('uses setRoleValue for dynamic property writes', () => {
      expect(content).toContain(
        'setRoleValue(resources, role, entry.resource)'
      );
      expect(content).toContain(
        'setRoleValue(resources, activeRole, userInfo.fullProfile)'
      );
      expect(content).toContain('setRoleValue(merged, role, apply(resource))');
      expect(content).toContain('setRoleValue(updated, role, {');
    });

    it('has no direct bracket writes with role keys', () => {
      expect(content).not.toMatch(/resources\[role\]/);
      expect(content).not.toMatch(/resources\[activeRole\]/);
      expect(content).not.toMatch(/merged\[role\]/);
      expect(content).not.toMatch(/updated\[role\]/);
    });
  });

  describe('role-profiles.ts (role-keyed maps)', () => {
    const { content } = readFile('src/services/role-profiles.ts');

    it('types ROLE_CODES as Partial so undefined is explicit', () => {
      expect(content).toContain('Partial<');
      expect(content).not.toMatch(/const ROLE_CODES: Record<string/);
    });

    it('reads ROLE_CODES via getRoleValue', () => {
      expect(content).toContain('getRoleValue(ROLE_CODES, role)');
      expect(content).not.toContain('const roleCode = ROLE_CODES[role]');
    });

    it('reads responseEntries via .at()', () => {
      expect(content).toContain('responseEntries.at(index)?.resource');
      expect(content).not.toContain('responseEntries[index]');
    });

    it('writes roleProfiles via setRoleValue', () => {
      expect(content).toContain('setRoleValue(roleProfiles, role, profile)');
      expect(content).not.toContain('roleProfiles[role] = profile');
    });
  });
});
