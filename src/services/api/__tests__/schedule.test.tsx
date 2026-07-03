import { describe, expect, it, vi } from 'vitest';
import { updatePractitionerRoleAvailability } from '../schedule';
import type { AxiosInstance } from 'axios';

const { mockGet, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn()
}));

vi.mock('../../api', () => ({
  getAPI: vi.fn<[], Promise<AxiosInstance>>().mockResolvedValue({
    get: mockGet,
    put: mockPut
  } as unknown as AxiosInstance)
}));

describe('updatePractitionerRoleAvailability', () => {
  it('includes period.start with local timezone offset in PUT payload', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        resourceType: 'PractitionerRole',
        id: 'role-123',
        active: true,
        availableTime: [{
          daysOfWeek: ['mon'],
          availableStartTime: '09:00',
          availableEndTime: '17:00'
        }]
      }
    });

    mockPut.mockResolvedValueOnce({
      data: { resourceType: 'PractitionerRole', id: 'role-123' }
    });

    await updatePractitionerRoleAvailability('role-123', [
      { daysOfWeek: ['mon'], availableStartTime: '09:00', availableEndTime: '17:00' }
    ]);

    expect(mockPut).toHaveBeenCalledTimes(1);
    const putUrl = mockPut.mock.calls[0][0] as string;
    const putBody = mockPut.mock.calls[0][1] as Record<string, unknown>;

    expect(putUrl).toBe('/fhir/PractitionerRole/role-123');
    expect(putBody).toHaveProperty('period');
    const period = putBody['period'] as Record<string, unknown>;
    expect(period).toHaveProperty('start');
    expect(typeof period.start).toBe('string');
    // Must include timezone offset (e.g., +07:00, +08:00, -05:00)
    expect(period.start).toMatch(/[+-]\d{2}:\d{2}$/);
  });
});
