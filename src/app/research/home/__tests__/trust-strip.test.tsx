import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TrustStrip from '../trust-strip';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('TrustStrip', () => {
  it('renders the heading and four statements', () => {
    render(<TrustStrip />);

    expect(
      screen.getByText('True for every study on Konsulin')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'A random ID, not your name. Researchers never see who you are.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'You stay in control. Review your data, withdraw or delete it at any time.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Never sold. Data is collected for research and nothing else.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Open platform. The code is public at github.com/konsulin-care'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('links to the help section of the FAQ', () => {
    render(<TrustStrip />);

    expect(
      screen.getByText('If things feel heavy right now, find help here')
    ).toBeInTheDocument();
    expect(screen.getByTestId('trust-strip-help')).toHaveAttribute(
      'href',
      'https://konsulin.care/faq/#bantuan'
    );
  });
});
