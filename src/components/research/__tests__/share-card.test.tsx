import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShareCard from '../share-card';

const writeText = vi.fn(() => Promise.resolve());

describe('ShareCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    writeText.mockClear();
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    });
  });

  it('copies a patient link carrying ref=p_<fhirId>', async () => {
    render(<ShareCard isPatient fhirId='DG3F3STPYZ6HX25A' />);

    fireEvent.click(screen.getByTestId('share-copy'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/research?ref=p_DG3F3STPYZ6HX25A`
      );
    });
  });

  it('copies a plain link for guests', async () => {
    render(<ShareCard isPatient={false} />);

    fireEvent.click(screen.getByTestId('share-copy'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/research`
      );
    });
  });

  it('opens wa.me with the encoded prefilled message', () => {
    render(<ShareCard isPatient />);

    const href =
      screen.getByTestId('share-whatsapp').getAttribute('href') ?? '';
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(href).not.toContain(' ');
    expect(decodeURIComponent(href.split('text=')[1] ?? '')).toContain(
      'Konsulin'
    );
  });

  it('increments the share booster and shows the badge', async () => {
    render(<ShareCard isPatient />);

    fireEvent.click(screen.getByTestId('share-copy'));

    await waitFor(() => {
      expect(screen.getByTestId('share-count').textContent).toContain(
        '1 share'
      );
    });
    expect(screen.getByTestId('share-badge').textContent).toContain('buddy');
  });
});
