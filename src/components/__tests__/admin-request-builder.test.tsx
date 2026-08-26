import { AdminRequestBuilder } from '@/components/admin/admin-request-builder';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/services/admin-api', () => ({
  adminRequest: vi.fn().mockResolvedValue({}),
  parseAdminKeyError: vi.fn(() => 'error')
}));

describe('AdminRequestBuilder preview layout', () => {
  it('shows only Request URL for GET, no payload accordion', () => {
    render(<AdminRequestBuilder />);

    expect(screen.getByText('Request URL (read-only)')).toBeDefined();
    expect(screen.queryByText(/Payload preview/)).toBeNull();
  });

  it('shows Request URL and payload accordion for POST', () => {
    render(<AdminRequestBuilder />);

    // Switch to POST
    fireEvent.click(screen.getByText('GET'));
    fireEvent.click(screen.getByText('POST'));

    expect(screen.getByText('Request URL (read-only)')).toBeDefined();
    expect(screen.getByText(/Payload preview/)).toBeDefined();
  });

  it('payload accordion is collapsed by default for POST', () => {
    render(<AdminRequestBuilder />);

    fireEvent.click(screen.getByText('GET'));
    fireEvent.click(screen.getByText('POST'));

    // The textarea inside the accordion should not be visible when closed
    const details = screen.getByText(/Payload preview/).closest('details');
    expect(details).not.toBeNull();
    expect(details!.open).toBe(false);
  });

  it('payload accordion opens on click', () => {
    render(<AdminRequestBuilder />);

    fireEvent.click(screen.getByText('GET'));
    fireEvent.click(screen.getByText('POST'));

    const summary = screen.getByText(/Payload preview/);
    fireEvent.click(summary);

    const details = summary.closest('details');
    expect(details!.open).toBe(true);
  });
});
