import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ParticipantProgress from '../participant-progress';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('ParticipantProgress', () => {
  it('shows the count against the target with a capped progress bar', () => {
    render(<ParticipantProgress count={150} target={100} />);

    expect(screen.getByText('150 of 100 participants')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
  });

  it('rounds the progress percentage', () => {
    render(<ParticipantProgress count={1} target={3} />);

    expect(screen.getByText('1 of 3 participants')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '33'
    );
  });

  it('shows the count without a bar when the target is 0', () => {
    render(<ParticipantProgress count={1} target={0} />);

    expect(screen.getByText('1 participants')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows the count without a bar when the target is missing', () => {
    render(<ParticipantProgress count={4} />);

    expect(screen.getByText('4 participants')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    render(<ParticipantProgress count={0} target={100} isLoading />);

    expect(
      screen.getByTestId('participant-progress-skeleton')
    ).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
