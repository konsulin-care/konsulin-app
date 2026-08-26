import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/admin-api', () => ({
  adminRequest: vi.fn(),
  clearAdminKey: vi.fn(),
  setAdminKey: vi.fn(),
  parseAdminKeyError: vi.fn()
}));

import { AdminRequestBuilder } from '@/components/admin/admin-request-builder';
import { adminRequest } from '@/services/admin-api';

describe('AdminRequestBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders method selector, endpoint input and execute button', () => {
    render(<AdminRequestBuilder />);
    expect(screen.getByLabelText(/method/i)).toBeDefined();
    expect(screen.getByLabelText(/endpoint/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /send/i })).toBeDefined();
  });

  it('sends a GET with dynamic query params', async () => {
    vi.mocked(adminRequest).mockResolvedValue({ resourceType: 'Bundle' });
    render(<AdminRequestBuilder />);

    fireEvent.change(screen.getByLabelText(/method/i), {
      target: { value: 'GET' }
    });
    fireEvent.change(screen.getByLabelText(/endpoint/i), {
      target: { value: '/fhir/Organization' }
    });
    // add one query param row
    fireEvent.click(screen.getByRole('button', { name: /add param/i }));
    fireEvent.change(screen.getByLabelText(/param key 1/i), {
      target: { value: 'active' }
    });
    fireEvent.change(screen.getByLabelText(/param value 1/i), {
      target: { value: 'true' }
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(adminRequest).toHaveBeenCalledWith(
        'GET',
        '/fhir/Organization?active=true',
        undefined
      );
    });
  });

  it('sends POST with a payload built from dynamic fields', async () => {
    vi.mocked(adminRequest).mockResolvedValue({ resourceType: 'Organization' });
    render(<AdminRequestBuilder />);

    fireEvent.change(screen.getByLabelText(/method/i), {
      target: { value: 'POST' }
    });
    fireEvent.change(screen.getByLabelText(/endpoint/i), {
      target: { value: '/fhir/Organization' }
    });

    // Organization schema exposes active + name fields
    const activeInput = screen.getByLabelText(/active/i);
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(activeInput, { target: { value: 'true' } });
    fireEvent.change(nameInput, { target: { value: 'Konsulin HQ' } });

    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(adminRequest).toHaveBeenCalledWith('POST', '/fhir/Organization', {
        resourceType: 'Organization',
        active: true,
        name: 'Konsulin HQ'
      });
    });
  });

  it('merges the raw JSON escape hatch into the payload', async () => {
    vi.mocked(adminRequest).mockResolvedValue({
      resourceType: 'HealthcareService'
    });
    render(<AdminRequestBuilder />);

    fireEvent.change(screen.getByLabelText(/method/i), {
      target: { value: 'POST' }
    });
    fireEvent.change(screen.getByLabelText(/endpoint/i), {
      target: { value: '/fhir/HealthcareService' }
    });
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Gen Consult' }
    });
    fireEvent.change(screen.getByLabelText(/raw json/i), {
      target: {
        value:
          '{"extension":[{"url":"http://konsulin.care/fhir/StructureDefinition/fee","valueMoney":{"value":250000,"currency":"IDR"}}]}'
      }
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(adminRequest).toHaveBeenCalledWith(
        'POST',
        '/fhir/HealthcareService',
        expect.objectContaining({
          resourceType: 'HealthcareService',
          name: 'Gen Consult',
          extension: expect.any(Array)
        })
      );
    });
  });

  it('renders the constructed payload in a read-only textarea', () => {
    render(<AdminRequestBuilder />);

    fireEvent.change(screen.getByLabelText(/method/i), {
      target: { value: 'POST' }
    });
    fireEvent.change(screen.getByLabelText(/endpoint/i), {
      target: { value: '/fhir/Organization' }
    });
    fireEvent.change(screen.getByLabelText(/active/i), {
      target: { value: 'true' }
    });

    const preview = screen.getByLabelText(
      /payload preview/i
    ) as HTMLTextAreaElement;
    expect(preview.readOnly).toBe(true);
    const parsed = JSON.parse(preview.value) as Record<string, unknown>;
    expect(parsed.resourceType).toBe('Organization');
    expect(parsed.active).toBe(true);
  });

  it('clears field inputs when the endpoint changes', () => {
    render(<AdminRequestBuilder />);
    fireEvent.change(screen.getByLabelText(/method/i), {
      target: { value: 'POST' }
    });
    fireEvent.change(screen.getByLabelText(/endpoint/i), {
      target: { value: '/fhir/Organization' }
    });
    fireEvent.change(screen.getByLabelText(/active/i), {
      target: { value: 'true' }
    });
    fireEvent.change(screen.getByLabelText(/endpoint/i), {
      target: { value: '/fhir/Slot' }
    });

    expect(screen.queryByLabelText(/active/i)).toBeNull();
  });
});
