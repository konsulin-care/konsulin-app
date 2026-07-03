import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('../api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '../api';
import { usePayAppointment, useRelayBooking } from '../api/appointments';

function createWrapper(): ({ children }: { children: ReactNode }) => React.JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('useRelayBooking', () => {
  it('posts to /api/v1/relay/booking with correct payload', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      data: {
        slotId: 'Slot/slot-789',
        invoiceId: 'Invoice/inv-012',
        fee: { value: 150_000, currency: 'IDR' },
        healthcareServiceName: 'General Consultation'
      }
    });
    vi.mocked(getAPI).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      { post: mockPost } as any
    );

    const { result } = renderHook(() => useRelayBooking(), {
      wrapper: createWrapper()
    });

    const payload = {
      patientId: 'Patient/pat-1',
      practitionerRoleId: 'PractitionerRole/pr-123',
      practitionerId: 'Practitioner/prac-1',
      healthcareServiceId: 'HealthcareService/hs-456',
      scheduleId: 'Schedule/sched-1',
      organizationId: 'Organization/org-1',
      date: '2026-07-15',
      startTime: '10:00',
      endTime: '10:30',
      timezone: '+07:00',
      condition: 'anxiety'
    };

    const response = await result.current.mutateAsync(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/v1/relay/booking', payload);
    expect(getAPI).toHaveBeenCalledWith({ proxy: false });
    expect(response.slotId).toBe('Slot/slot-789');
    expect(response.invoiceId).toBe('Invoice/inv-012');
    expect(response.fee).toEqual({ value: 150_000, currency: 'IDR' });
    expect(response.healthcareServiceName).toBe('General Consultation');
  });
});

describe('usePayAppointment', () => {
  it('includes healthcareServiceId in the POST payload', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      data: { paymentUrl: 'https://payment.example.com/url' }
    });
    vi.mocked(getAPI).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      { post: mockPost } as any
    );

    const { result } = renderHook(() => usePayAppointment(), {
      wrapper: createWrapper()
    });

    const payload = {
      patientId: 'Patient/pat-1',
      invoiceId: 'Invoice/inv-1',
      useOnlinePayment: true,
      practitionerRoleId: 'PractitionerRole/pr-123',
      slotId: 'Slot/slot-789',
      condition: 'anxiety',
      healthcareServiceId: 'HealthcareService/hs-456'
    };

    await result.current.mutateAsync(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/v1/pay/appointment', payload);
    expect(getAPI).toHaveBeenCalledWith();
  });
});
