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
      const urlIdx = lines.findLastIndex(l =>
        l.includes('BackendBaseURL') && l.includes('/api/v1/')
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
      const writeIdx = lines.findIndex(
        l => l.includes('setRoleValue(existing, role, fhirId)')
      );
      expect(writeIdx).toBeGreaterThanOrEqual(0);
    });

    it('uses getRoleValue helper for dynamic property reads', () => {
      const readIdx = lines.findIndex(
        l => l.includes('getRoleValue(map, role)')
      );
      expect(readIdx).toBeGreaterThanOrEqual(0);
    });

    it('getRoleValue guards with Object.hasOwn + isValidRoleKey before property access', () => {
      const fnStart = lines.findIndex(l =>
        l.includes('function getRoleValue')
      );
      expect(fnStart).toBeGreaterThanOrEqual(0);
      const body = lines.slice(fnStart, fnStart + 10);
      expect(body.some(l => l.includes('Object.hasOwn'))).toBe(true);
      expect(body.some(l => l.includes('isValidRoleKey(role)'))).toBe(true);
      expect(body.some(l => l.includes('return map[role]'))).toBe(true);
    });

    it('setRoleValue guards with Object.hasOwn + isValidRoleKey before property write', () => {
      const fnStart = lines.findIndex(l =>
        l.includes('function setRoleValue')
      );
      expect(fnStart).toBeGreaterThanOrEqual(0);
      const body = lines.slice(fnStart, fnStart + 10);
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
      const readIdx = exportedLines.findIndex(l =>
        l.includes('return map[')
      );
      expect(readIdx).toBe(-1);
    });
  });
});
