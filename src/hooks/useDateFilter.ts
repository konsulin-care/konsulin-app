import {
  CONTENT_CUSTOM,
  CONTENT_DEFAULT
} from '@/components/shared/date-filter-presets';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

/** Options configuring the default/custom date-filter state machine. */
export interface UseDateFilterOptions {
  /** True when every filter field is still in its initial empty state. */
  readonly isInitialState?: boolean;
  /**
   * Seeds default values when the custom pane opens from the initial state.
   * Runs before the pane switches; use it to set default dates/times.
   */
  readonly onCustomOpenSeed?: () => void;
  /** Notified with the chosen range whenever a preset is selected. */
  readonly onPresetSelect?: (start: Date, end: Date) => void;
  /** Notified with the chosen range whenever the calendar selection changes. */
  readonly onCalendarSelect?: (
    from: Date | undefined,
    to: Date | undefined
  ) => void;
}

/** State and handlers owned by the default/custom date-filter flow. */
export interface UseDateFilterResult {
  /** Active pane: CONTENT_DEFAULT (presets) or CONTENT_CUSTOM (calendar). */
  readonly whichContent: number;
  /** True once the user deviates from the preset dates via the calendar. */
  readonly isUseCustomDate: boolean;
  /** Switch back to the preset pane (drawer close / Back button). */
  readonly openDefaultPane: () => void;
  /** Open the custom calendar pane, seeding defaults when initial. */
  readonly handleCustomOpen: () => void;
  /** Handle a preset button click: clear custom mode, notify the range. */
  readonly handlePresetSelect: (start: Date, end: Date) => void;
  /** Handle a calendar range selection: notify the range, set custom mode. */
  readonly handleCalendarSelect: (range: DateRange | undefined) => void;
  /** Force the custom-date flag (e.g. when resetting filters). */
  readonly setIsUseCustomDate: (value: boolean) => void;
}

/**
 * Shared state machine for the default/custom date-filter drawer flow.
 *
 * Owns which pane is visible (preset list vs custom calendar) and the
 * isUseCustomDate flag. Components keep their own filter object and wire the
 * callbacks into their page-specific sections.
 *
 * @param options - Seed and notification callbacks (see UseDateFilterOptions).
 * @returns Pane state plus handlers (see UseDateFilterResult).
 */
export function useDateFilter(
  options: UseDateFilterOptions
): UseDateFilterResult {
  const { isInitialState, onCustomOpenSeed, onPresetSelect, onCalendarSelect } =
    options;
  const [whichContent, setWhichContent] = useState<number>(CONTENT_DEFAULT);
  const [isUseCustomDate, setIsUseCustomDate] = useState<boolean>(false);

  /** Switch back to the preset pane. */
  const openDefaultPane = () => {
    setWhichContent(CONTENT_DEFAULT);
  };

  /** Open the custom pane, seeding defaults when the filter is initial. */
  const handleCustomOpen = () => {
    if (isInitialState && onCustomOpenSeed) {
      onCustomOpenSeed();
      setIsUseCustomDate(true);
    }
    setWhichContent(CONTENT_CUSTOM);
  };

  /** Handle a preset selection: leave custom mode and apply the range. */
  const handlePresetSelect = (start: Date, end: Date) => {
    setIsUseCustomDate(false);
    onPresetSelect?.(start, end);
  };

  /** Handle a calendar selection: apply the range and enter custom mode. */
  const handleCalendarSelect = (range: DateRange | undefined) => {
    onCalendarSelect?.(range?.from, range?.to ? range.to : range?.from);
    setIsUseCustomDate(true);
  };

  return {
    whichContent,
    isUseCustomDate,
    openDefaultPane,
    handleCustomOpen,
    handlePresetSelect,
    handleCalendarSelect,
    setIsUseCustomDate
  };
}
