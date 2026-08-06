import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
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
      onClick={() => onOpenChange?.(false)}
    >
      {children}
    </div>
  ),
  DrawerTrigger: ({ children }: { children: ReactNode }) => (
    <div data-testid='drawer-trigger'>{children}</div>
  ),
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div data-testid='drawer-content'>{children}</div>
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

import AppDrawer from '@/components/ui/app-drawer';

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
