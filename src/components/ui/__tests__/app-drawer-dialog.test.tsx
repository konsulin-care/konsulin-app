import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AppDrawer from '@/components/ui/app-drawer';

/**
 * Install a matchMedia stub so `(min-width: 768px)` matches while every
 * other query reports no match (tablet/desktop dialog mode).
 */
function stubDesktopMatchMedia(): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('min-width: 768px'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    }))
  );
}

describe('AppDrawer at 768px and up', () => {
  beforeEach(() => {
    stubDesktopMatchMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a centred dialog with title, description, body and CTA', () => {
    render(
      <AppDrawer
        open
        onClose={vi.fn()}
        title='Dialog Title'
        description='Dialog Description'
        ctaLabel='Confirm'
        onCtaClick={vi.fn()}
      >
        <p>Dialog body</p>
      </AppDrawer>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Dialog Title');
    expect(dialog).toHaveTextContent('Dialog Description');
    expect(dialog).toHaveTextContent('Dialog body');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <AppDrawer open onClose={onClose} title='Dialog Title'>
        <p>Dialog body</p>
      </AppDrawer>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('disables the CTA when ctaDisabled is true', () => {
    render(
      <AppDrawer
        open
        onClose={vi.fn()}
        ctaLabel='Confirm'
        onCtaClick={vi.fn()}
        ctaDisabled
      >
        <p>Dialog body</p>
      </AppDrawer>
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('closes an already open drawer when another drawer opens', () => {
    /** Two independently controlled drawers with explicit open buttons. */
    function Harness() {
      const [aOpen, setAOpen] = useState(false);
      const [bOpen, setBOpen] = useState(false);
      return (
        <div>
          <AppDrawer open={aOpen} onClose={() => setAOpen(false)} title='A'>
            <p>Body A</p>
          </AppDrawer>
          <AppDrawer open={bOpen} onClose={() => setBOpen(false)} title='B'>
            <p>Body B</p>
          </AppDrawer>
          <button type='button' onClick={() => setAOpen(true)}>
            open-a
          </button>
          <button type='button' onClick={() => setBOpen(true)}>
            open-b
          </button>
        </div>
      );
    }

    render(<Harness />);

    // The open dialog aria-hides the rest of the document, so the harness
    // buttons are queried by text rather than by accessible role.
    fireEvent.click(screen.getByText('open-a'));
    expect(screen.getByRole('dialog')).toHaveTextContent('A');

    fireEvent.click(screen.getByText('open-b'));
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveTextContent('B');
    expect(dialogs[0]).not.toHaveTextContent('Body A');
  });
});
