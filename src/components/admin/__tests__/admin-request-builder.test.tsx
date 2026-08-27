import { AdminRequestBuilder } from '@/components/admin/admin-request-builder';
import { adminRequest } from '@/services/admin-api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Polyfill pointer capture methods for Radix UI in jsdom
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  Element.prototype.hasPointerCapture ??= () => false;
});

// Mock admin-api to avoid real HTTP calls
vi.mock('@/services/admin-api', () => ({
  adminRequest: vi.fn().mockResolvedValue({}),
  parseAdminKeyError: vi.fn().mockReturnValue('error')
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminRequestBuilder', () => {
  describe('Method dropdown', () => {
    it('does not render a native <select> element', () => {
      render(<AdminRequestBuilder />);
      const nativeSelect = document.querySelector('select');
      expect(nativeSelect).toBeNull();
    });

    it('renders a combobox trigger for method (shadcn Select)', () => {
      render(<AdminRequestBuilder />);
      // Radix Select renders a trigger with role="combobox"
      const methodTrigger = screen.getAllByRole('combobox')[0];
      expect(methodTrigger).toBeDefined();
    });

    it('shows GET with blue badge by default', () => {
      render(<AdminRequestBuilder />);
      const methodTrigger = screen.getAllByRole('combobox')[0];
      expect(methodTrigger.textContent).toContain('GET');
      // Check for blue color class on the trigger itself
      expect(methodTrigger.className).toContain('bg-blue-100');
    });

    it('renders all four method options when opened', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      const methodTrigger = screen.getAllByRole('combobox')[0];
      await user.click(methodTrigger);

      // All four methods should be visible in the dropdown
      expect(screen.getAllByText('GET').length).toBeGreaterThan(0);
      expect(screen.getAllByText('POST').length).toBeGreaterThan(0);
      expect(screen.getAllByText('PUT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('DELETE').length).toBeGreaterThan(0);
    });

    it('renders colored badges for each method', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      const methodTrigger = screen.getAllByRole('combobox')[0];
      await user.click(methodTrigger);

      // Each method should have a colored badge span (use first match from dropdown)
      const getBadges = screen.getAllByText('GET');
      const getBadge = getBadges[0]?.closest('[class*="bg-blue"]');
      const postBadges = screen.getAllByText('POST');
      const postBadge = postBadges[0]?.closest('[class*="bg-green"]');
      const putBadges = screen.getAllByText('PUT');
      const putBadge = putBadges[0]?.closest('[class*="bg-amber"]');
      const deleteBadges = screen.getAllByText('DELETE');
      const deleteBadge = deleteBadges[0]?.closest('[class*="bg-red"]');

      expect(getBadge).not.toBeNull();
      expect(postBadge).not.toBeNull();
      expect(putBadge).not.toBeNull();
      expect(deleteBadge).not.toBeNull();
    });
  });

  describe('Endpoint input', () => {
    it('renders a text input for endpoint (not a button)', () => {
      render(<AdminRequestBuilder />);
      const input = screen.getByRole('textbox', { name: /endpoint/i });
      expect(input).toBeDefined();
      expect(input.tagName).toBe('INPUT');
    });

    it('shows default endpoint /fhir/Organization', () => {
      render(<AdminRequestBuilder />);
      const input = screen.getByRole('textbox', {
        name: /endpoint/i
      }) as HTMLInputElement;
      expect(input.value).toBe('/fhir/Organization');
    });

    it('does not render a <datalist> element', () => {
      render(<AdminRequestBuilder />);
      const datalist = document.querySelector('datalist');
      expect(datalist).toBeNull();
    });

    it('shows suggestion list on focus', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      const input = screen.getByRole('textbox', { name: /endpoint/i });
      await user.click(input);

      // Should show resource type group headings
      expect(screen.getByText('Organization')).toBeDefined();
    });

    it('filters suggestions when typing', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      const input = screen.getByRole('textbox', { name: /endpoint/i });
      await user.click(input);
      await user.clear(input);
      await user.type(input, 'Patient');

      // Should show Patient in suggestions
      expect(screen.getByText('/fhir/Patient')).toBeDefined();
      // Organization should not be visible (filtered out) - check suggestion buttons
      const orgSuggestions = screen.queryAllByText('/fhir/Organization');
      // The preview textarea still has /fhir/Organization, so filter by button elements
      const orgButtons = orgSuggestions.filter(el => el.tagName === 'BUTTON');
      expect(orgButtons.length).toBe(0);
    });

    it('selects an endpoint when clicking a suggestion', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      const input = screen.getByRole('textbox', {
        name: /endpoint/i
      }) as HTMLInputElement;
      await user.click(input);
      await user.clear(input);

      // Wait for suggestions to appear (all endpoints shown when query is empty)
      await screen.findByText('/fhir/Patient');

      // Use fireEvent.mouseDown to trigger the onMouseDown handler on the suggestion
      const suggestionButton = screen.getByRole('button', {
        name: '/fhir/Patient'
      });
      fireEvent.mouseDown(suggestionButton);
      fireEvent.mouseUp(suggestionButton);
      fireEvent.click(suggestionButton);

      // Input should be updated
      expect(input.value).toBe('/fhir/Patient');
    });

    it('allows typing custom endpoints', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      const input = screen.getByRole('textbox', {
        name: /endpoint/i
      }) as HTMLInputElement;
      await user.click(input);
      await user.clear(input);
      await user.type(input, '/fhir/Patient/abc-123');

      expect(input.value).toBe('/fhir/Patient/abc-123');
    });

    it('closes suggestion list on Escape', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      const input = screen.getByRole('textbox', { name: /endpoint/i });
      await user.click(input);

      // Suggestions should be visible
      expect(screen.getByText('Organization')).toBeDefined();

      await user.keyboard('{Escape}');

      // Suggestions should be hidden
      expect(screen.queryByText('Organization')).toBeNull();
    });

    it('filters endpoints when method changes to DELETE', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      // Open method dropdown and select DELETE
      const methodTrigger = screen.getAllByRole('combobox')[0];
      await user.click(methodTrigger);
      const deleteOption = screen.getAllByText('DELETE')[0];
      await user.click(deleteOption);

      // Focus endpoint input
      const input = screen.getByRole('textbox', { name: /endpoint/i });
      await user.click(input);

      // DELETE is only available on Organization
      expect(screen.getByText('Organization')).toBeDefined();
      // Patient does not support DELETE, should not appear
      expect(screen.queryByText('Patient')).toBeNull();
    });
  });

  describe('Layout', () => {
    it('does not show "Method" label text', () => {
      render(<AdminRequestBuilder />);
      expect(screen.queryByText('Method')).toBeNull();
    });

    it('does not show "Endpoint" label text', () => {
      render(<AdminRequestBuilder />);
      expect(screen.queryByText('Endpoint')).toBeNull();
    });

    it('renders method and endpoint in a flex row', () => {
      render(<AdminRequestBuilder />);
      const comboboxes = screen.getAllByRole('combobox');
      const methodContainer = comboboxes[0].closest('[class*="flex"]');
      expect(methodContainer).not.toBeNull();
    });

    it('renders method and endpoint in a single bordered container', () => {
      render(<AdminRequestBuilder />);
      // Find the container that has both border and rounded classes
      const borderedContainer = document.querySelector(
        '[class*="rounded-md"][class*="border"]'
      );
      expect(borderedContainer).not.toBeNull();
      // Method combobox and endpoint input should be inside this container
      const methodCombobox = screen.getByRole('combobox', { name: /method/i });
      const endpointInput = screen.getByRole('textbox', { name: /endpoint/i });
      expect(borderedContainer?.contains(methodCombobox)).toBe(true);
      expect(borderedContainer?.contains(endpointInput)).toBe(true);
    });

    it('does not render a vertical divider between method and endpoint', () => {
      render(<AdminRequestBuilder />);
      // The method wrapper should NOT have border-r class
      const methodWrapper = screen
        .getByRole('combobox', { name: /method/i })
        .closest('[class*="shrink-0"]');
      expect(methodWrapper).not.toBeNull();
      expect(methodWrapper?.className).not.toContain('border-r');
    });

    it('renders method trigger with colored background matching the method', () => {
      render(<AdminRequestBuilder />);
      const methodTrigger = screen.getByRole('combobox', { name: /method/i });
      // GET is selected by default, should have blue background
      expect(methodTrigger.className).toContain('bg-blue-100');
    });

    it('renders method trigger without its own border', () => {
      render(<AdminRequestBuilder />);
      const methodTrigger = screen.getByRole('combobox', { name: /method/i });
      // Method trigger should have border-none to override shadcn default
      expect(methodTrigger.className).toContain('border-none');
    });

    it('renders method and endpoint side by side without wrapping', () => {
      render(<AdminRequestBuilder />);
      // Find the bordered container
      const borderedContainer = document.querySelector(
        '[class*="rounded-md"][class*="border"]'
      );
      expect(borderedContainer).not.toBeNull();
      // Container should have flex layout (not flex-wrap)
      const classList = borderedContainer?.className;
      expect(classList).toContain('flex');
      expect(classList).not.toContain('flex-wrap');
      // Both children should be direct children of the flex container
      const children = borderedContainer?.children;
      expect(children.length).toBe(2);
    });
  });

  describe('Endpoint reselect form preservation', () => {
    it('keeps the filled form when the current endpoint is re-selected', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      // Switch to POST so the Organization payload fields appear.
      await user.click(screen.getByRole('combobox', { name: /method/i }));
      await user.click(screen.getAllByText('POST')[0]);

      // Fill in the Organization fields.
      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Acme Clinic' }
      });
      fireEvent.change(screen.getByLabelText('Active'), {
        target: { value: 'true' }
      });

      // Re-select the same endpoint from the dropdown suggestions.
      const endpointInput = screen.getByRole('textbox', {
        name: /endpoint/i
      });
      fireEvent.focus(endpointInput);
      const suggestion = screen.getByRole('button', {
        name: '/fhir/Organization'
      });
      fireEvent.mouseDown(suggestion);
      fireEvent.mouseUp(suggestion);
      fireEvent.click(suggestion);

      // The form must still hold the entered values.
      expect(screen.getByLabelText('Name')).toHaveValue('Acme Clinic');
      expect(screen.getByLabelText('Active')).toHaveValue('true');

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(vi.mocked(adminRequest)).toHaveBeenCalledWith(
          'POST',
          '/fhir/Organization',
          { resourceType: 'Organization', active: true, name: 'Acme Clinic' }
        );
      });
    });

    it('resets the form when a different endpoint is selected', async () => {
      const user = userEvent.setup();
      render(<AdminRequestBuilder />);

      await user.click(screen.getByRole('combobox', { name: /method/i }));
      await user.click(screen.getAllByText('POST')[0]);

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Acme Clinic' }
      });

      // Select Location — the Organization values must be wiped.
      const endpointInput = screen.getByRole('textbox', {
        name: /endpoint/i
      });
      fireEvent.focus(endpointInput);
      fireEvent.change(endpointInput, {
        target: { value: '/fhir/Location' }
      });
      const suggestion = screen.getByRole('button', {
        name: '/fhir/Location'
      });
      fireEvent.mouseDown(suggestion);
      fireEvent.mouseUp(suggestion);
      fireEvent.click(suggestion);

      expect(screen.getByLabelText('Name')).toHaveValue('');

      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(vi.mocked(adminRequest)).toHaveBeenCalledWith(
          'POST',
          '/fhir/Location',
          { resourceType: 'Location' }
        );
      });
    });
  });
});
