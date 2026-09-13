import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  updatePractitionerRoleAvailability,
  updatePractitionerRoleAvailabilityBundle
} from '../schedule';

const { mockGet, mockPut, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockPost: vi.fn()
}));

vi.mock('../../api', () => ({
  getAPI: vi.fn<() => Promise<AxiosInstance>>().mockResolvedValue({
    get: mockGet,
    put: mockPut,
    post: mockPost
  } as unknown as AxiosInstance)
}));

describe('updatePractitionerRoleAvailability', () => {
  it('includes period.start with local timezone offset in PUT payload', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        resourceType: 'PractitionerRole',
        id: 'role-123',
        active: true,
        availableTime: [
          {
            daysOfWeek: ['mon'],
            availableStartTime: '09:00',
            availableEndTime: '17:00'
          }
        ]
      }
    });

    mockPut.mockResolvedValueOnce({
      data: { resourceType: 'PractitionerRole', id: 'role-123' }
    });

    await updatePractitionerRoleAvailability('role-123', [
      {
        daysOfWeek: ['mon'],
        availableStartTime: '09:00',
        availableEndTime: '17:00'
      }
    ]);

    expect(mockPut).toHaveBeenCalledTimes(1);
    const putUrl = mockPut.mock.calls[0][0] as string;
    const putBody = mockPut.mock.calls[0][1] as Record<string, unknown>;

    expect(putUrl).toBe('/fhir/PractitionerRole/role-123');
    expect(putBody).toHaveProperty('period');
    const period = putBody.period as Record<string, unknown>;
    expect(period).toHaveProperty('start');
    expect(typeof period.start).toBe('string');
    // Must include timezone offset (e.g., +07:00, +08:00, -05:00)
    expect(period.start).toMatch(/[+-]\d{2}:\d{2}$/);
  });
});

describe('updatePractitionerRoleAvailabilityBundle', () => {
  const mondayMorning = [
    {
      daysOfWeek: ['mon' as const],
      availableStartTime: '09:00',
      availableEndTime: '12:00'
    }
  ];

  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPost.mockResolvedValue({
      data: { resourceType: 'Bundle', type: 'transaction-response' }
    });
  });

  it('sends a version-aware PUT for each role, keyed by the requested id', async () => {
    mockGet.mockImplementation((url: string) => {
      const id = url.split('/').pop();
      return Promise.resolve({
        data: {
          resourceType: 'PractitionerRole',
          id,
          meta: { versionId: id === 'role-1' ? '3' : '7' },
          active: true
        }
      });
    });

    await updatePractitionerRoleAvailabilityBundle([
      { practitionerRoleId: 'role-1', availableTime: mondayMorning },
      { practitionerRoleId: 'role-2', availableTime: [] }
    ]);

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = mockPost.mock.calls[0] as [
      string,
      Bundle,
      { headers: Record<string, string> }
    ];
    expect(url).toBe('/fhir');
    expect(config.headers['Content-Type']).toBe('application/fhir+json');
    expect(body.type).toBe('transaction');
    expect(body.entry?.map(entry => entry.request)).toEqual([
      { method: 'PUT', url: 'PractitionerRole/role-1', ifMatch: 'W/"3"' },
      { method: 'PUT', url: 'PractitionerRole/role-2', ifMatch: 'W/"7"' }
    ]);
    expect(body.entry?.[0].resource).toMatchObject({
      id: 'role-1',
      active: true,
      availableTime: mondayMorning
    });
  });

  it('omits ifMatch when the read returned no versionId', async () => {
    mockGet.mockResolvedValue({
      data: { resourceType: 'PractitionerRole', id: 'role-1' }
    });

    await updatePractitionerRoleAvailabilityBundle([
      { practitionerRoleId: 'role-1', availableTime: mondayMorning }
    ]);

    const body = mockPost.mock.calls[0][1] as Bundle;
    expect(body.entry?.[0].request).toEqual({
      method: 'PUT',
      url: 'PractitionerRole/role-1'
    });
  });
});
