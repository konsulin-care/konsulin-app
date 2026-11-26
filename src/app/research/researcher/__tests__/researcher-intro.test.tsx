import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherIntro, { ResearcherSectionHeading } from '../researcher-intro';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('ResearcherIntro', () => {
  it('renders one h1 with the exact title', () => {
    render(<ResearcherIntro />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      'Your studies. People give you their answers. This page keeps track of what you owe them back.'
    );
  });
});

describe('ResearcherSectionHeading', () => {
  it('renders the exact next-step heading', () => {
    render(<ResearcherSectionHeading kind='next-step' />);

    expect(screen.getByText('Your next step')).toBeInTheDocument();
  });

  it('renders the your-studies heading with the count', () => {
    render(<ResearcherSectionHeading kind='your-studies' count={4} />);

    expect(screen.getByText('Your studies · 4')).toBeInTheDocument();
  });

  it('renders the given-back heading', () => {
    render(<ResearcherSectionHeading kind='given-back' />);

    expect(screen.getByText('What you have given back')).toBeInTheDocument();
  });
});
