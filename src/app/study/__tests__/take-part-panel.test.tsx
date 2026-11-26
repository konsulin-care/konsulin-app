import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TakePartPanel } from '../take-part-panel';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('TakePartPanel', () => {
  it('shows Take part with helper and calls onTakePart', () => {
    const onTakePart = vi.fn();
    render(
      <TakePartPanel studyId='s1' isJoined={false} onTakePart={onTakePart} />
    );
    expect(
      screen.getByText(
        'You will read what taking part means before anything is shared.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Take part' }));
    expect(onTakePart).toHaveBeenCalledTimes(1);
  });

  it('shows Continue with minutes, or Start', () => {
    const { rerender } = render(
      <TakePartPanel studyId='s1' isJoined minutes={5} onTakePart={vi.fn()} />
    );
    expect(
      screen.getByRole('button', { name: 'Continue, about 5 min' })
    ).toBeInTheDocument();
    rerender(<TakePartPanel studyId='s1' isJoined onTakePart={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('shows thanks and the report link when the batch is complete', () => {
    render(
      <TakePartPanel
        studyId='s1'
        isJoined
        batchComplete
        isRepeated
        onTakePart={vi.fn()}
      />
    );
    expect(
      screen.getByText('Shared for this batch. Thank you.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The next batch will show up on your home page when it opens.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'See your report' })
    ).toHaveAttribute('href', '/report?id=s1');
  });
});
