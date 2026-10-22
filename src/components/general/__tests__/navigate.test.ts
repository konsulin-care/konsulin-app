import { navigate } from '@/components/general/navigate';
import { describe, expect, it, vi } from 'vitest';

const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  })
);

vi.mock('next/navigation', () => ({
  redirect: mockRedirect
}));

describe('navigate', () => {
  it('calls redirect with the provided URL', () => {
    expect(() => navigate('/test')).toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/test');
  });
});
