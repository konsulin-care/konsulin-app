import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('globals.css', () => {
  it('reserves the scrollbar gutter so the page column does not jump between routes', () => {
    const css = readFileSync(
      path.resolve(process.cwd(), 'src/styles/globals.css'),
      'utf8'
    );

    // `scrollbar-gutter: stable` on the root keeps the vertical scrollbar
    // gutter reserved on classic-scrollbar platforms, so the centered page
    // column keeps its horizontal position when a scrollbar appears or
    // disappears during route navigation. No-op on overlay scrollbars.
    expect(css).toMatch(/html\s*{[^}]*scrollbar-gutter\s*:\s*stable/);
  });

  it('reserves a 72px shell offset from md and 240px from lg', () => {
    const css = readFileSync(
      path.resolve(process.cwd(), 'src/styles/globals.css'),
      'utf8'
    );

    expect(css).toMatch(/--shell-offset\s*:\s*0px/);

    const mdBlock = css.match(/@media \(min-width: 768px\)\s*{([\s\S]*?)\n}/);
    expect(mdBlock).not.toBeNull();
    expect(mdBlock?.[1]).toContain('--shell-offset: 72px');

    const lgBlock = css.match(/@media \(min-width: 1024px\)\s*{([\s\S]*?)\n}/);
    expect(lgBlock).not.toBeNull();
    expect(lgBlock?.[1]).toContain('--shell-offset: 240px');
  });
});
