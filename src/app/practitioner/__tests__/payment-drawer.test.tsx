import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Invoice, PractitionerRole } from 'fhir/r4';
import type { ReactNode } from 'react';
import { act } from 'react';
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
  setPaymentPendingOpen: vi.fn(),
  practitionerName: 'Dr. John Doe',
  bookingState: {
    date: new Date('2026-07-15'),
    startTime: '10:00'
  },
  isPaying: false,
  patientId: 'patient-1',
  selectedSlotId: 'slot-123',
  appointmentId: 'appt-1',
  bookingForm: { session_type: 'offline', problem_brief: 'test issue' },
  practitionerRole: {
    id: 'role-1',
    resourceType: 'PractitionerRole'
  } as PractitionerRole,
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

  it('renders the Pay Now CTA', () => {
    render(<PaymentDrawer {...baseProps} />, { wrapper: createWrapper() });
    expect(screen.getByText('Pay Now')).toBeInTheDocument();
    expect(screen.queryByText('Pay Later')).not.toBeInTheDocument();
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

  it('renders date with Calendar icon', () => {
    render(<PaymentDrawer {...baseProps} />, { wrapper: createWrapper() });
    const dateRow = screen.getByText(/15 July 2026/).closest('div');
    expect(dateRow).toBeInTheDocument();
    // Calendar icon renders as an SVG with data-lucide attribute or aria-label
    const svg = dateRow?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders time with Clock icon', () => {
    render(<PaymentDrawer {...baseProps} />, { wrapper: createWrapper() });
    const timeRow = screen.getByText(/10:00/).closest('div');
    expect(timeRow).toBeInTheDocument();
    const svg = timeRow?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders organization name with MapPin icon', () => {
    render(
      <PaymentDrawer
        {...baseProps}
        practitionerOrganizationName='Konsulin Clinic'
      />,
      { wrapper: createWrapper() }
    );
    const locationRow = screen.getByText('Konsulin Clinic').closest('div');
    expect(locationRow).toBeInTheDocument();
    const svg = locationRow?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders total charge from invoice', () => {
    const invoice = {
      id: 'inv-1',
      totalNet: { value: 150_000, currency: 'IDR' }
    } as Invoice;
    render(<PaymentDrawer {...baseProps} invoice={invoice} />, {
      wrapper: createWrapper()
    });
    expect(screen.getByText(/150,000/)).toBeInTheDocument();
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

  it('includes healthcareServiceId and appointmentId in the payment payload', () => {
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
        healthcareServiceId: 'HealthcareService/hs-456',
        appointmentId: 'Appointment/appt-1'
      })
    );
    expect(payAppointment.mock.calls[0][0]).not.toHaveProperty(
      'useOnlinePayment'
    );
  });

  it('opens the payment pending drawer after opening the payment URL', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const payAppointment = vi.fn().mockResolvedValue({
      data: { paymentUrl: 'https://payment.example.com/url' }
    });
    const setPaymentOpen = vi.fn();
    const setIsOpen = vi.fn();
    const setPaymentPendingOpen = vi.fn();

    render(
      <PaymentDrawer
        {...baseProps}
        payAppointment={payAppointment}
        invoice={
          {
            id: 'inv-1',
            totalNet: { value: 150_000, currency: 'IDR' }
          } as Invoice
        }
        setPaymentOpen={setPaymentOpen}
        setIsOpen={setIsOpen}
        setPaymentPendingOpen={setPaymentPendingOpen}
      />,
      { wrapper: createWrapper() }
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Pay Now'));
      await Promise.resolve();
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://payment.example.com/url',
      '_blank'
    );
    expect(setPaymentOpen).toHaveBeenCalledWith(false);
    expect(setIsOpen).toHaveBeenCalledWith(false);
    expect(setPaymentPendingOpen).toHaveBeenCalledWith(true);
    openSpy.mockRestore();
  });

  it('disables Pay Now when practitionerRole.id is missing', () => {
    render(
      <PaymentDrawer
        {...baseProps}
        practitionerRole={{} as PractitionerRole}
      />,
      { wrapper: createWrapper() }
    );
    const buttons = screen.getAllByTestId('mock-button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('does not call payAppointment when practitionerRole.id is missing', () => {
    const payAppointment = vi.fn().mockResolvedValue({ data: {} });
    render(
      <PaymentDrawer
        {...baseProps}
        practitionerRole={{} as PractitionerRole}
        payAppointment={payAppointment}
        invoice={
          {
            id: 'inv-1',
            totalNet: { value: 150_000, currency: 'IDR' }
          } as Invoice
        }
      />,
      { wrapper: createWrapper() }
    );
    fireEvent.click(screen.getByText('Pay Now'));
    expect(payAppointment).not.toHaveBeenCalled();
  });
});
