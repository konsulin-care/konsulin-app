import { scanSource } from '@/styles/__tests__/raw-color-scan';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import Loading from '../loading';
import ResearchSkeleton from '../research-skeleton';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('research route loading', () => {
  it('renders a skeleton placeholder while the route chunk loads', () => {
    render(<Loading />);

    expect(screen.getByTestId('research-route-loading')).toBeTruthy();
  });

  it('uses an <output> element with the implicit status role', () => {
    render(<Loading />);

    expect(screen.getByTestId('research-route-loading').tagName).toBe('OUTPUT');
    expect(screen.getByRole('status')).toBe(
      screen.getByTestId('research-route-loading')
    );
  });
});

describe('research skeleton', () => {
  it('renders placeholder blocks with bg-muted and no raw colours', () => {
    const { container } = render(<ResearchSkeleton />);
    const placeholders = Array.from(
      container.querySelectorAll('.animate-pulse')
    );

    expect(placeholders.length).toBeGreaterThan(0);
    for (const placeholder of placeholders) {
      expect(placeholder.className).toContain('bg-muted');
    }
    expect(container.innerHTML).not.toMatch(/bg-white|bg-\[#/);
  });

  it('keeps its source scan-clean', () => {
    const testDir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(
      resolve(testDir, '../research-skeleton.tsx'),
      'utf8'
    );

    expect(scanSource(source)).toEqual([]);
  });
});
