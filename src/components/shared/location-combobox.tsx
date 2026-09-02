'use client';

// Location picker combobox.
//
// Thin wrapper over the generic responsive combobox (`./combobox`) that keeps
// the original default export and props so existing consumers and tests remain
// unchanged. Renders a popover on `min-width: 640px` and a bottom sheet with a
// pinned search input below that breakpoint.
export { default, type ComboboxOption, type ComboboxProps } from './combobox';
