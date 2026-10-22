import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({
    children,
    open,
    onOpenChange
  }: {
    children: ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-testid='drawer-root'
      data-open={open}
      onClick={event => {
        if (event.target === event.currentTarget) onOpenChange?.(false);
      }}
    >
      {children}
    </div>
  ),
  DrawerTrigger: ({ children }: { children: ReactNode }) => (
    <div data-testid='drawer-trigger'>{children}</div>
  ),
  DrawerContent: ({
    children,
    'data-suspended': dataSuspended,
    hideOverlay
  }: {
    children: ReactNode;
    'data-suspended'?: boolean;
    hideOverlay?: boolean;
  }) => (
    <div
      data-testid='drawer-content'
      data-suspended={dataSuspended ?? false}
      data-hide-overlay={hideOverlay ?? false}
    >
      {children}
    </div>
  ),
  DrawerHeader: ({ children }: { children: ReactNode }) => (
    <div data-testid='drawer-header'>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => (
    <div data-testid='drawer-title'>{children}</div>
  ),
  DrawerDescription: ({ children }: { children: ReactNode }) => (
    <div data-testid='drawer-description'>{children}</div>
  )
}));

import AppDrawer, { useAppDrawerHost } from '@/components/ui/app-drawer';

describe('AppDrawer', () => {
  it('renders title, description, and body children', () => {
    render(
      <AppDrawer open onClose={vi.fn()} title='My Title' description='My Desc'>
        <p>Body content</p>
      </AppDrawer>
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Desc')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('applies the standard 16px inset to the body content wrapper', () => {
    render(
      <AppDrawer open onClose={vi.fn()} title='My Title'>
        <p>Body content</p>
      </AppDrawer>
    );

    const body = screen.getByText('Body content').parentElement;
    expect(body?.className).toContain('px-4');
    expect(body?.className).toContain('pb-4');
  });

  it('renders the CTA label and calls onCtaClick on click', () => {
    const onCtaClick = vi.fn();
    render(
      <AppDrawer
        open
        onClose={vi.fn()}
        ctaLabel='Submit'
        onCtaClick={onCtaClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });

  it('disables the CTA when ctaDisabled is true', () => {
    render(
      <AppDrawer
        open
        onClose={vi.fn()}
        ctaLabel='Submit'
        onCtaClick={vi.fn()}
        ctaDisabled
      />
    );

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('shows a spinner instead of the label when ctaLoading is true', () => {
    render(
      <AppDrawer
        open
        onClose={vi.fn()}
        ctaLabel='Submit'
        onCtaClick={vi.fn()}
        ctaLoading
      />
    );

    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('renders no footer when ctaLabel is omitted', () => {
    render(
      <AppDrawer open onClose={vi.fn()}>
        <p>Body content</p>
      </AppDrawer>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders footerContent under the CTA', () => {
    render(
      <AppDrawer
        open
        onClose={vi.fn()}
        ctaLabel='Submit'
        onCtaClick={vi.fn()}
        footerContent={<small>Footnote</small>}
      />
    );

    expect(screen.getByText('Footnote')).toBeInTheDocument();
  });

  it('renders the trigger slot', () => {
    render(
      <AppDrawer open onClose={vi.fn()} trigger={<button>Open Drawer</button>}>
        <p>Body content</p>
      </AppDrawer>
    );

    expect(screen.getByText('Open Drawer')).toBeInTheDocument();
  });

  it('calls onClose when the drawer is dismissed', () => {
    const onClose = vi.fn();
    render(
      <AppDrawer
        open
        onClose={onClose}
        ctaLabel='Submit'
        onCtaClick={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('drawer-root'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/** Two independently controlled drawers plus an open button for each. */
function TwoDrawerHarness() {
  const [aOpen, setAOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  return (
    <div>
      <AppDrawer open={aOpen} onClose={() => setAOpen(false)} title='Drawer A'>
        <p>Body A</p>
      </AppDrawer>
      <AppDrawer open={bOpen} onClose={() => setBOpen(false)} title='Drawer B'>
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

/** Drawer roots in render order: [drawer A, drawer B]. */
function drawerRoots() {
  return screen.getAllByTestId('drawer-root');
}

describe('AppDrawer exclusive enforcement', () => {
  it('closes an already open drawer when another drawer opens', () => {
    render(<TwoDrawerHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-a' }));
    let roots = drawerRoots();
    expect(roots[0]).toHaveAttribute('data-open', 'true');
    expect(roots[1]).toHaveAttribute('data-open', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'open-b' }));
    roots = drawerRoots();
    expect(roots[0]).toHaveAttribute('data-open', 'false');
    expect(roots[1]).toHaveAttribute('data-open', 'true');
  });

  it('closes the existing drawer symmetrically in the reverse order', () => {
    render(<TwoDrawerHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-b' }));
    let roots = drawerRoots();
    expect(roots[0]).toHaveAttribute('data-open', 'false');
    expect(roots[1]).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'open-a' }));
    roots = drawerRoots();
    expect(roots[0]).toHaveAttribute('data-open', 'true');
    expect(roots[1]).toHaveAttribute('data-open', 'false');
  });

  it('never closes the drawer that just opened', () => {
    render(<TwoDrawerHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-a' }));
    fireEvent.click(screen.getByRole('button', { name: 'open-b' }));

    const roots = drawerRoots();
    expect(roots[1]).toHaveAttribute('data-open', 'true');
  });
});

/** Child of AppDrawer that drives the host suspension via context. */
function SuspendControls() {
  const host = useAppDrawerHost();
  return (
    <div>
      <button type='button' onClick={() => host.suspend()}>
        suspend
      </button>
      <button type='button' onClick={() => host.resume()}>
        resume
      </button>
      <p>Host children stay mounted</p>
    </div>
  );
}

function SuspendHarness() {
  const [open, setOpen] = useState(true);
  return (
    <AppDrawer open={open} onClose={() => setOpen(false)} title='Host'>
      <SuspendControls />
    </AppDrawer>
  );
}

describe('AppDrawer suspension', () => {
  it('hides the suspended drawer without unmounting its children', () => {
    render(<SuspendHarness />);

    expect(screen.getByTestId('drawer-content')).toHaveAttribute(
      'data-suspended',
      'false'
    );
    expect(screen.getByText('Host children stay mounted')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'suspend' }));
    expect(screen.getByTestId('drawer-content')).toHaveAttribute(
      'data-suspended',
      'true'
    );
    expect(screen.getByTestId('drawer-content')).toHaveAttribute(
      'data-hide-overlay',
      'true'
    );
    expect(screen.getByText('Host children stay mounted')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'resume' }));
    expect(screen.getByTestId('drawer-content')).toHaveAttribute(
      'data-suspended',
      'false'
    );
    expect(screen.getByTestId('drawer-content')).toHaveAttribute(
      'data-hide-overlay',
      'false'
    );
    expect(screen.getByText('Host children stay mounted')).toBeInTheDocument();
  });

  it('clears the suspension when the drawer closes', () => {
    render(<SuspendHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'suspend' }));
    expect(screen.getByTestId('drawer-content')).toHaveAttribute(
      'data-suspended',
      'true'
    );

    fireEvent.click(screen.getByTestId('drawer-root'));
    expect(screen.getByTestId('drawer-root')).toHaveAttribute(
      'data-open',
      'false'
    );
    expect(screen.getByTestId('drawer-content')).toHaveAttribute(
      'data-suspended',
      'false'
    );
  });
});
