import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MUI overrides use design tokens', () => {
  const fabMui = readFileSync(resolve(__dirname, '../_fab-mui.scss'), 'utf8');
  const soapForm = readFileSync(
    resolve(__dirname, '../custom-soap-form.scss'),
    'utf8'
  );

  it('fills the FAB with turquoise-deep-safe turquoise and charcoal content', () => {
    expect(fabMui).toMatch(
      /\.MuiFab-root\s*\{[^}]*background-color:\s*var\(--color-turquoise\) !important;/
    );
    expect(fabMui).toMatch(
      /\.MuiFab-root\s*\{[^}]*color:\s*var\(--color-charcoal-900\) !important;/
    );
    expect(fabMui).not.toMatch(/#00838f/i);
    expect(fabMui).not.toMatch(/\bwhite\b/i);
  });

  it('styles the disabled FAB with charcoal surface tokens', () => {
    expect(fabMui).toMatch(
      /\.MuiFab-root\.Mui-disabled\s*\{[^}]*background-color:\s*var\(--color-charcoal-100\) !important;/
    );
    expect(fabMui).toMatch(
      /\.MuiFab-root\.Mui-disabled\s*\{[^}]*color:\s*var\(--color-charcoal-700\) !important;/
    );
  });

  it('fills the add-repeat button with charcoal and paper text', () => {
    expect(soapForm).toMatch(
      /\[data-test='button-add-repeat-item'\]:not\(\.Mui-disabled\)\s*\{[^}]*background-color:\s*var\(--color-charcoal-900\) !important;/
    );
    expect(soapForm).toMatch(
      /\[data-test='button-add-repeat-item'\]:not\(\.Mui-disabled\)\s*\{[^}]*color:\s*var\(--color-paper\) !important;/
    );
    expect(soapForm).not.toMatch(/#0abdc3/i);
  });

  it('fills table rows with the surface token', () => {
    expect(soapForm).toMatch(
      /\.MuiTableRow-root\s*\{[^}]*background-color:\s*var\(--color-surface\) !important;/
    );
  });
});
