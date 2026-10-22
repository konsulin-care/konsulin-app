import { render } from '@testing-library/react';
import { vi } from 'vitest';
import Combobox, { type ComboboxOption, type ComboboxProps } from '../combobox';

export { mockLocale } from './combobox-test-mocks';

/** Province options used as the default render options. */
export const PROVINCES: readonly ComboboxOption[] = [
  { code: '31', name: 'DKI Jakarta' },
  { code: '32', name: 'Jawa Barat' },
  { code: '33', name: 'Jawa Tengah' }
];

/** Two plain options used for multi-select toggling tests. */
export const TWO_OPTIONS: readonly ComboboxOption[] = [
  { code: 'a', name: 'Option A' },
  { code: 'b', name: 'Option B' }
];

/** Override props for the single-select renderCombobox helper. */
export type ComboboxOverrides = Partial<
  Extract<ComboboxProps, { readonly multiple?: false }>
>;

/**
 * Render Combobox with the shared defaults; override per-test props.
 *
 * @param overrides - Props to replace on top of the defaults.
 * @returns The RTL render result.
 */
export function renderCombobox(overrides: ComboboxOverrides = {}) {
  return render(
    <Combobox
      options={PROVINCES}
      value=''
      onSelect={vi.fn()}
      placeholder='Select province'
      {...overrides}
    />
  );
}

/**
 * Render a multi-select Combobox over TWO_OPTIONS for toggling tests.
 *
 * @param onSelect - Spy receiving the toggled code list.
 */
export function renderMultiCombobox(onSelect: (codes: string[]) => void): void {
  render(
    <Combobox
      multiple
      options={TWO_OPTIONS}
      value={[]}
      onSelect={onSelect}
      placeholder='Select items'
    />
  );
}

/**
 * Make (max-width: 640px) match so the sheet variant renders.
 */
export function stubMobileViewport(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('(max-width: 640px)'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}
