import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShareResearchButton from '../share-research-button';

describe('ShareResearchButton', () => {
  const TITLE = 'Sleep Cohort';
  const ORIGIN = 'https://konsulin.care';
  const MESSAGE =
    `Join me as a citizen scientist through ${TITLE} in Konsulin.\n` +
    'https://konsulin.care/research?id=study-x';

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new URL(`${ORIGIN}/research`)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a footer button with the share icon and default label', () => {
    render(
      <ShareResearchButton title={TITLE} isPatient={false} studyId='study-x' />
    );

    const button = screen.getByTestId('share-research-footer');
    expect(button).toHaveTextContent('Tap to share this survey');
    expect(button.querySelector('svg')).toBeTruthy();
  });

  it('shares the full message via the Web Share API', async () => {
    const share = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, { share });

    render(
      <ShareResearchButton title={TITLE} isPatient={false} studyId='study-x' />
    );

    fireEvent.click(screen.getByTestId('share-research-footer'));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: TITLE,
        text: MESSAGE,
        url: 'https://konsulin.care/research?id=study-x'
      });
    });
  });

  it('copies the full message and shows Link copied! when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, {
      share: undefined,
      clipboard: { writeText }
    });

    render(
      <ShareResearchButton title={TITLE} isPatient={false} studyId='study-x' />
    );

    fireEvent.click(screen.getByTestId('share-research-footer'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(MESSAGE);
    });
    expect(await screen.findByText('Link copied!')).toBeTruthy();
  });

  it('renders a custom label when given', () => {
    render(
      <ShareResearchButton
        title={TITLE}
        isPatient={false}
        studyId='study-x'
        label='Share Research'
        dataTestId='custom-share'
      />
    );

    expect(screen.getByTestId('custom-share')).toHaveTextContent(
      'Share Research'
    );
  });

  it('applies the className to the button', () => {
    render(
      <ShareResearchButton
        title={TITLE}
        isPatient={false}
        studyId='study-x'
        className='text-black'
      />
    );

    expect(screen.getByTestId('share-research-footer')).toHaveClass(
      'text-black'
    );
  });
});
