import { EndpointUrlInput } from '@/components/admin/endpoint-url-input';
import { getEndpointOptionsGrouped } from '@/lib/admin/endpoints';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const groupedEndpoints = getEndpointOptionsGrouped('GET');

function setup() {
  const onSelect = vi.fn();
  render(
    <EndpointUrlInput
      value='/fhir/Organization'
      onSelect={onSelect}
      groupedEndpoints={groupedEndpoints}
    />
  );
  return { onSelect };
}

describe('EndpointUrlInput', () => {
  it('commits free-form value on Enter when no suggestion is highlighted', () => {
    const { onSelect } = setup();
    const input = screen.getByRole('textbox', { name: 'Endpoint' });

    fireEvent.change(input, {
      target: { value: '/fhir/Organization/org-123' }
    });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('/fhir/Organization/org-123');
  });

  it('commits free-form value on blur when modified', async () => {
    const { onSelect } = setup();
    const input = screen.getByRole('textbox', { name: 'Endpoint' });

    fireEvent.change(input, {
      target: { value: '/fhir/Organization/org-456' }
    });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('/fhir/Organization/org-456');
    });
  });

  it('does not call onSelect on blur when value unchanged', () => {
    const { onSelect } = setup();
    const input = screen.getByRole('textbox', { name: 'Endpoint' });

    fireEvent.blur(input);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not duplicate commit when Enter followed by blur', async () => {
    const { onSelect } = setup();
    const input = screen.getByRole('textbox', { name: 'Endpoint' });

    fireEvent.change(input, {
      target: { value: '/fhir/Organization/org-789' }
    });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);

    // Enter committed it; blur should not commit again
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
    expect(onSelect).toHaveBeenCalledWith('/fhir/Organization/org-789');
  });
});
