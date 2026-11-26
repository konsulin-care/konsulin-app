import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudyNotFound } from '../study-not-found';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('StudyNotFound', () => {
  it('shows the message and a link to /studies', () => {
    render(<StudyNotFound />);
    expect(
      screen.getByText(
        'This study is not open. It may have closed, or the link may be incomplete.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'See open studies' })
    ).toHaveAttribute('href', '/studies');
  });
});
