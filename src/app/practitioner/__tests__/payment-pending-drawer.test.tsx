import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/general/avatar', () => ({
  default: ({
    initials,
    photoUrl
  }: {
    initials?: string;
    photoUrl?: string;
  }) => (
    <div
      data-testid='mock-avatar'
      data-initials={initials}
      data-photo={photoUrl}
    >
      Avatar
    </div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid='mock-loading-spinner' {...props} />
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid='mock-button'
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
  buttonVariants: () => 'btn-variants-class'
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({
    children,
    open
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (
    <div data-testid='mock-drawer' data-open={open}>
      {children}
    </div>
  ),
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-drawer-content'>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-drawer-header'>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-drawer-title'>{children}</div>
  ),
  DrawerDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-drawer-description'>{children}</div>
  ),
  DrawerTrigger: ({ children }: { children: React.ReactNode }) => children
}));

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace })
}));

import PaymentPendingDrawer from '../payment-pending-drawer';

const baseProps = {
  pendingOpen: true,
  setPendingOpen: vi.fn(),
  practitionerName: 'Dr. John Doe',
  practitionerOrganizationName: 'Klinik Sehat',
  healthcareServiceName: 'General Checkup',
  bookingState: {
    date: new Date('2026-07-15'),
    startTime: '10:00'
  }
};

describe('PaymentPendingDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the payment in process title and description when open', () => {
    render(<PaymentPendingDrawer {...baseProps} />);

    expect(screen.getByText('Payment in process')).toBeInTheDocument();
    expect(screen.getByText(/opened tab/i)).toBeInTheDocument();
    expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
  });

  it('renders the session summary line', () => {
    render(<PaymentPendingDrawer {...baseProps} />);

    expect(screen.getByText(/General Checkup/)).toBeInTheDocument();
    expect(screen.getByText(/15 July 2026/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('renders the View Schedule CTA', () => {
    render(<PaymentPendingDrawer {...baseProps} />);

    expect(screen.getByText('View Schedule')).toBeInTheDocument();
  });

  it('navigates to /schedule and closes the drawer on CTA click', () => {
    const setPendingOpen = vi.fn();
    render(
      <PaymentPendingDrawer {...baseProps} setPendingOpen={setPendingOpen} />
    );

    fireEvent.click(screen.getByText('View Schedule'));

    expect(mockReplace).toHaveBeenCalledWith('/schedule');
    expect(setPendingOpen).toHaveBeenCalledWith(false);
  });

  it('does not render content when closed', () => {
    render(<PaymentPendingDrawer {...baseProps} pendingOpen={false} />);

    expect(screen.getByTestId('mock-drawer')).toHaveAttribute(
      'data-open',
      'false'
    );
  });
});
