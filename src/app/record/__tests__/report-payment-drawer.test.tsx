import { fireEvent, render, screen } from '@testing-library/react';
import type { Money } from 'fhir/r4';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    className
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button data-testid='mock-button' onClick={onClick} className={className}>
      {children}
    </button>
  ),
  buttonVariants: () => 'btn-variants-class'
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: ReactNode; open: boolean }) => (
    <div data-testid='mock-drawer' data-open={open}>
      {children}
    </div>
  ),
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div data-testid='mock-drawer-content'>{children}</div>
  )
}));

import ReportPaymentDrawer from '../report-payment-drawer';

const FEE: Money = { value: 50_000, currency: 'IDR' };

describe('ReportPaymentDrawer', () => {
  it('renders the total fee formatted via formatFee', () => {
    render(<ReportPaymentDrawer open fee={FEE} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Rp 50,000')).toBeInTheDocument();
  });

  it('renders the Pay Now CTA', () => {
    render(<ReportPaymentDrawer open fee={FEE} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Pay Now')).toBeInTheDocument();
  });

  it('closes the drawer when Pay Now is clicked', () => {
    const onOpenChange = vi.fn();
    render(<ReportPaymentDrawer open fee={FEE} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('Pay Now'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
