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
});
