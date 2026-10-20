import { fireEvent, render, screen } from '@testing-library/react';
import type { Invoice } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () =>
  (await import('./payment-drawer-mocks')).paymentDrawerI18nMockFactory()
);
vi.mock('@/components/general/avatar', async () =>
  (await import('./payment-drawer-mocks')).paymentDrawerAvatarMockFactory()
);
vi.mock('@/components/icons', async () =>
  (await import('./payment-drawer-mocks')).paymentDrawerIconsMockFactory()
);
vi.mock('@/components/ui/button', async () =>
  (await import('./payment-drawer-mocks')).paymentDrawerButtonMockFactory()
);
vi.mock('@/components/ui/drawer', async () =>
  (await import('./payment-drawer-mocks')).paymentDrawerUIMockFactory()
);

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

  it('renders the session summary with separate date and time rows', () => {
    render(<PaymentPendingDrawer {...baseProps} />);

    expect(screen.getByText('General Checkup')).toBeInTheDocument();
    const dateRow = screen.getByText('15 July 2026').closest('div');
    expect(dateRow).toBeInTheDocument();
    expect(dateRow?.querySelector('svg')).toBeInTheDocument();
    const timeRow = screen.getByText('10:00').closest('div');
    expect(timeRow).toBeInTheDocument();
    expect(timeRow?.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the Total row from the invoice', () => {
    const invoice = {
      id: 'inv-1',
      totalNet: { value: 150_000, currency: 'IDR' }
    } as Invoice;
    render(<PaymentPendingDrawer {...baseProps} invoice={invoice} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/150,000/)).toBeInTheDocument();
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
