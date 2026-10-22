import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderLocationFormFields } from './location-form-fields-test-fixtures';

// Geometry/cascade and translation mocks live in the shared mocks file.
vi.mock('@/services/api/cities', async () =>
  (await import('./location-form-fields-test-mocks')).citiesApiMockFactory()
);

vi.mock('@/i18n', async () =>
  (
    await import('./location-form-fields-test-mocks')
  ).locationFormFieldsI18nMockFactory()
);

describe('LocationFormFields image uploader', () => {
  it('renders LocationImageUploader as the first child', () => {
    renderLocationFormFields({
      imageUrl: 'https://example.com/image.webp'
    });

    // The uploader preview img should exist with a translated alt
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'Location preview');
  });
});

describe('LocationFormFields status toggle', () => {
  it('renders SwitchField for status instead of tab buttons', () => {
    renderLocationFormFields();

    // Should render a switch with label "Open" (checked = active)
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toBeChecked();
    expect(screen.getByText('Open')).toBeInTheDocument();

    // Should NOT render the old tab buttons
    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('shows offLabel when status is inactive', () => {
    renderLocationFormFields({ status: 'inactive' });

    const switchEl = screen.getByRole('switch');
    expect(switchEl).not.toBeChecked();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
  });
});

describe('LocationFormFields address placeholder', () => {
  it('uses the translated address placeholder', () => {
    renderLocationFormFields();

    expect(screen.getByPlaceholderText('Street address')).toBeInTheDocument();
  });
});
