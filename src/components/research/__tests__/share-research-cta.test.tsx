import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShareResearchCta from '../share-research-cta';

const writeText = vi.fn(() => Promise.resolve());

describe('ShareResearchCta', () => {
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

  it('shares a patient link with the ref', async () => {
    render(<ShareResearchCta isPatient fhirId='DG3F3STPYZ6HX25A' />);

    fireEvent.click(screen.getByTestId('cta-copy'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/research?ref=p_DG3F3STPYZ6HX25A`
      );
    });
  });

  it('wa.me message embeds the share link', () => {
    render(<ShareResearchCta isPatient fhirId='DG3F3STPYZ6HX25A' />);

    const href = screen.getByTestId('cta-whatsapp').getAttribute('href') ?? '';
    const message = decodeURIComponent(href.split('text=')[1] ?? '');
    expect(message).toContain('Konsulin');
    expect(message).toContain(
      `${window.location.origin}/research?ref=p_DG3F3STPYZ6HX25A`
    );
  });

  it('counts the share toward the booster', async () => {
    render(<ShareResearchCta isPatient />);

    fireEvent.click(screen.getByTestId('cta-copy'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
    expect(window.localStorage.getItem('konsulin_share_booster')).toBe('1');
  });
});
