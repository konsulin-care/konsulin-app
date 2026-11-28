import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readGlobals = (): string =>
  readFileSync(path.resolve(process.cwd(), 'src/styles/globals.css'), 'utf8');

describe('globals.css', () => {
  it('hides scrollbars on every element', () => {
    const css = readGlobals();

    // Scrollbars are hidden globally and replaced by the page overlay thumb
    // and the per-container edge fades, so inner containers never reserve a
    // gutter and the centered page column cannot jump between routes.
    expect(css).toMatch(/\*[^{]*{[^}]*scrollbar-width\s*:\s*none/);
    expect(css).toMatch(/\*::-webkit-scrollbar[^{]*{[^}]*display\s*:\s*none/);
  });

  it('no longer reserves the scrollbar gutter', () => {
    const css = readGlobals();

    expect(css).not.toContain('scrollbar-gutter');
  });

  it('fades scroll container edges through data attributes', () => {
    const css = readGlobals();

    const fadeBlock = css.match(/\[data-scroll-fade\]\s*{([\s\S]*?)\n}/);
    expect(fadeBlock).not.toBeNull();
    expect(fadeBlock?.[1]).toContain('mask-image');
    expect(fadeBlock?.[1]).toContain('mask-composite: intersect');

    for (const side of ['top', 'bottom', 'left', 'right']) {
      const sideBlock = css.match(
        new RegExp(`\\[data-fade-${side}='true'\\]\\s*{([\\s\\S]*?)\\n}`)
      );
      expect(sideBlock).not.toBeNull();
      expect(sideBlock?.[1]).toContain(`--fade-${side}: var(--fade)`);
    }
  });

  it('reserves a 72px shell offset from md and 240px from lg', () => {
    const css = readGlobals();

    expect(css).toMatch(/--shell-offset\s*:\s*0px/);

    const mdBlock = css.match(/@media \(min-width: 768px\)\s*{([\s\S]*?)\n}/);
    expect(mdBlock).not.toBeNull();
    expect(mdBlock?.[1]).toContain('--shell-offset: 72px');

    const lgBlock = css.match(/@media \(min-width: 1024px\)\s*{([\s\S]*?)\n}/);
    expect(lgBlock).not.toBeNull();
    expect(lgBlock?.[1]).toContain('--shell-offset: 240px');
  });
});
