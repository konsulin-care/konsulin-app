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

  describe('fhirIdMap.ts', () => {
    const { lines } = readFile('src/context/auth/fhirIdMap.ts');

    it('guards dynamic property write with Object.hasOwn', () => {
      const writeIdx = lines.findIndex(
        l => l.includes('existing[') && l.includes('] = fhirId')
      );
      expect(writeIdx).toBeGreaterThanOrEqual(0);
      const guard = lines
        .slice(0, writeIdx)
        .findLast(l => l.includes('Object.hasOwn'));
      expect(guard).toBeDefined();
    });

    it('guards dynamic property read with Object.hasOwn', () => {
      const readIdx = lines.findIndex(l => l.includes('return map['));
      expect(readIdx).toBeGreaterThanOrEqual(0);
      const guard = lines
        .slice(0, readIdx)
        .findLast(l => l.includes('Object.hasOwn'));
      expect(guard).toBeDefined();
    });
  });
});
