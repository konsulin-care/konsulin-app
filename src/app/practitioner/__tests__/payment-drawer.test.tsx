import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Invoice } from 'fhir/r4';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

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
  Button: Object.assign(
    ({
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
    { displayName: 'Button' }
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
  )
}));

vi.mock('@/context/booking/bookingTypes', () => ({}));

import PaymentDrawer from '../payment-drawer';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wrapper';
  return Wrapper;
}

const baseProps = {
  paymentOpen: true,
  setPaymentOpen: vi.fn(),
  practitionerName: 'Dr. John Doe',
  bookingState: {
    date: new Date('2026-07-15'),
    startTime: '10:00'
  } as unknown as { date: Date; startTime: string },
  isPaying: false,
  patientId: 'patient-1',
  selectedSlotId: 'slot-123',
  bookingForm: { session_type: 'offline', problem_brief: 'test issue' },
  practitionerRole: { id: 'role-1' } as { id: string },
  payAppointment: vi.fn(),
  queryClient: new QueryClient(),
  handleFilterChange: vi.fn(),
  setIsOpen: vi.fn()
};

describe('PaymentDrawer', () => {
  it('renders practitioner name', () => {
    render(<PaymentDrawer {...baseProps} />, { wrapper: createWrapper() });
    expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
  });

  it('renders Pay Now and Pay Later buttons', () => {
    render(<PaymentDrawer {...baseProps} />, { wrapper: createWrapper() });
    expect(screen.getByText('Pay Now')).toBeInTheDocument();
    expect(screen.getByText('Pay Later')).toBeInTheDocument();
    expect(screen.queryByText('Bayar Sekarang')).not.toBeInTheDocument();
    expect(screen.queryByText('Bayar Nanti')).not.toBeInTheDocument();
  });

  it('renders healthcare service name when provided', () => {
    render(
      <PaymentDrawer {...baseProps} healthcareServiceName='General Checkup' />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText(/General Checkup/)).toBeInTheDocument();
  });

  it('renders date and time in a combined line', () => {
    render(<PaymentDrawer {...baseProps} />, { wrapper: createWrapper() });
    // Should show the date formatted and time together in one element
    expect(screen.getByText(/15 July 2026/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('renders total charge from invoice', () => {
    const invoice = {
      id: 'inv-1',
      totalNet: { value: 150_000, currency: 'IDR' }
    } as Invoice;
    render(<PaymentDrawer {...baseProps} invoice={invoice} />, {
      wrapper: createWrapper()
    });
    expect(screen.getByText(/150.000/)).toBeInTheDocument();
  });

  it('disables buttons when selectedSlotId is null', () => {
    render(<PaymentDrawer {...baseProps} selectedSlotId={null} />, {
      wrapper: createWrapper()
    });
    const buttons = screen.getAllByTestId('mock-button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('includes healthcareServiceId in online payment payload', () => {
    const payAppointment = vi.fn().mockResolvedValue({ data: {} });
    const invoice = {
      id: 'inv-1',
      totalNet: { value: 150_000, currency: 'IDR' }
    } as Invoice;

    render(
      <PaymentDrawer
        {...baseProps}
        payAppointment={payAppointment}
        healthcareServiceId='hs-456'
        invoice={invoice}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByText('Pay Now'));

    expect(payAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        healthcareServiceId: 'HealthcareService/hs-456'
      })
    );
  });

  it('includes healthcareServiceId in offline payment payload', () => {
    const payAppointment = vi.fn().mockResolvedValue({ data: {} });
    const invoice = {
      id: 'inv-2',
      totalNet: { value: 150_000, currency: 'IDR' }
    } as Invoice;

    render(
      <PaymentDrawer
        {...baseProps}
        payAppointment={payAppointment}
        healthcareServiceId='hs-789'
        invoice={invoice}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByText('Pay Later'));

    expect(payAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        healthcareServiceId: 'HealthcareService/hs-789'
      })
    );
  });
});
