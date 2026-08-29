/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/app/practitioner/practitioner-availability', () => ({
  default: (props: any) => (
    <div
      data-testid='practitioner-availability'
      data-name={props.practitionerName ?? ''}
      data-photo={props.practitionerAvatar?.photoUrl ?? ''}
      data-seed={props.practitionerAvatar?.seed ?? ''}
      data-initials={props.practitionerAvatar?.initials ?? ''}
    >
      {props.children}
    </div>
  )
}));

import { getAPI } from '@/services/api';
import type { Recommendation } from '@/types/recommendation';
import RecommendationBooking from '../recommendation-booking';

const recommendation: Recommendation = {
  practitionerRoleId: 'role-1',
  practitionerId: 'prac-1',
  practitionerName: 'Dr. John Doe',
  practitionerPhoto: 'https://example.com/photo.jpg',
  specialties: ['Cardiology'],
  scheduleId: 'sched-1',
  healthcareServiceId: 'hs-1',
  healthcareServiceName: 'General Checkup',
  durationMinutes: 60,
  fee: 100_000,
  currency: 'IDR',
  locationId: 'loc-1',
  locationName: 'Konsulin Clinic',
  locationAddress: { line: ['Jl. Melati'] },
  distanceKm: 2.5
};

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

describe('RecommendationBooking', () => {
  it('passes practitioner identity and avatar to the booking drawer', async () => {
    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: {
          entry: [
            {
              resource: { resourceType: 'PractitionerRole', id: 'role-1' }
            },
            {
              resource: {
                resourceType: 'Organization',
                id: 'org-1',
                name: 'Konsulin Clinic'
              }
            }
          ]
        }
      })
    } as never);

    render(
      <RecommendationBooking recommendation={recommendation}>
        <span>Book</span>
      </RecommendationBooking>,
      { wrapper: createWrapper() }
    );

    const availability = await screen.findByTestId('practitioner-availability');
    expect(availability.dataset.name).toBe('Dr. John Doe');
    expect(availability.dataset.photo).toBe('https://example.com/photo.jpg');
    expect(availability.dataset.seed).toBe('Dr. John Doe');
    expect(availability.dataset.initials).toBe('JD');
  });
});
