import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Invoice } from 'fhir/r4';

vi.mock('@/components/general/avatar', () => ({
  default: ({ initials, photoUrl }: any) => (
    <div data-testid='mock-avatar' data-initials={initials} data-photo={photoUrl}>
      Avatar
    </div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: (props: any) => (
    <svg data-testid='mock-loading-spinner' {...props} />
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
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
  Drawer: ({ children, open }: any) => (
    <div data-testid='mock-drawer' data-open={open}>
      {children}
    </div>
  ),
  DrawerContent: ({ children }: any) => (
    <div data-testid='mock-drawer-content'>{children}</div>
  )
}));

vi.mock('@/context/booking/bookingTypes', () => ({}));

import PaymentDrawer from '../payment-drawer';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const baseProps = {
  paymentOpen: true,
  setPaymentOpen: vi.fn(),
  practitionerName: 'Dr. John Doe',
  bookingState: {
    date: new Date('2026-07-15'),
    startTime: '10:00'
  } as any,
  isPaying: false,
  patientId: 'patient-1',
  selectedSlotId: 'slot-123',
  bookingForm: { session_type: 'offline', problem_brief: 'test issue' },
  practitionerRole: { id: 'role-1' } as any,
  payAppointment: vi.fn(),
  queryClient: new QueryClient(),
  handleFilterChange: vi.fn(),
  setIsOpen: vi.fn()
};

describe('PaymentDrawer', () => {
  it('renders practitioner name', () => {
    render(
      <PaymentDrawer {...baseProps} />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
  });

  it('renders Pay Now and Pay Later buttons', () => {
    render(
      <PaymentDrawer {...baseProps} />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText('Pay Now')).toBeInTheDocument();
    expect(screen.getByText('Pay Later')).toBeInTheDocument();
    expect(screen.queryByText('Bayar Sekarang')).not.toBeInTheDocument();
    expect(screen.queryByText('Bayar Nanti')).not.toBeInTheDocument();
  });

  it('renders healthcare service name when provided', () => {
    render(
      <PaymentDrawer
        {...baseProps}
        healthcareServiceNames={['General Checkup', 'Counselling']}
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText(/General Checkup/)).toBeInTheDocument();
    expect(screen.getByText(/Counselling/)).toBeInTheDocument();
  });

  it('renders date and time in a combined line', () => {
    render(
      <PaymentDrawer {...baseProps} />,
      { wrapper: createWrapper() }
    );
    // Should show the date formatted and time together in one element
    expect(screen.getByText(/15 July 2026/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('renders total charge from invoice', () => {
    const invoice = {
      id: 'inv-1',
      totalNet: { value: 150000, currency: 'IDR' }
    } as Invoice;
    render(
      <PaymentDrawer {...baseProps} invoice={invoice} />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText(/150.000/)).toBeInTheDocument();
  });

  it('disables buttons when selectedSlotId is null', () => {
    render(
      <PaymentDrawer {...baseProps} selectedSlotId={null} />,
      { wrapper: createWrapper() }
    );
    const buttons = screen.getAllByTestId('mock-button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });
});
