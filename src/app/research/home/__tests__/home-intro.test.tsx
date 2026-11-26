import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomeIntro, { HomeSectionHeading } from '../home-intro';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('HomeIntro', () => {
  it('renders one h1 with the title and the platform sentence', () => {
    render(<HomeIntro />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      'Take part in research. See what it finds.'
    );
    expect(
      screen.getByText(
        'Every study here runs on Konsulin under the same rules: your answers travel under a random ID, never your name, and you can stop at any time.'
      )
    ).toBeInTheDocument();
  });
});

describe('HomeSectionHeading', () => {
  it('renders the up next heading', () => {
    render(<HomeSectionHeading kind='up-next' />);

    expect(screen.getByText('Up next')).toBeInTheDocument();
  });

  it('renders the your studies heading with the count', () => {
    render(<HomeSectionHeading kind='your-studies' count={3} />);

    expect(screen.getByText('Your studies · 3')).toBeInTheDocument();
  });

  it('renders the open to join heading', () => {
    render(<HomeSectionHeading kind='open-to-join' />);

    expect(screen.getByText('Open to join')).toBeInTheDocument();
  });

  it('renders the learning heading', () => {
    render(<HomeSectionHeading kind='learning' />);

    expect(screen.getByText('What we are learning')).toBeInTheDocument();
  });
});
