import {
  addDays,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks
} from 'date-fns';

/** Drawer pane showing the preset list (default date filter content). */
export const CONTENT_DEFAULT = 0;
/** Drawer pane showing the custom calendar/time filter. */
export const CONTENT_CUSTOM = 1;

/** Reference date all presets are derived from (module load time). */
export const today = new Date();

/** A date preset entry: translation key plus the resolved date range. */
export interface DatePreset {
  readonly labelKey: string;
  readonly value: { readonly start: Date; readonly end: Date };
}

/** Preset: today using the raw current timestamp. */
export const todayPreset: DatePreset = {
  labelKey: 'today',
  value: { start: today, end: today }
};

/** Preset: today clamped to full-day boundaries. */
export const fullDayTodayPreset: DatePreset = {
  labelKey: 'today',
  value: { start: startOfDay(today), end: endOfDay(today) }
};

/** Preset: this week (Monday-based, shifted one day forward). */
export const thisWeekPreset: DatePreset = {
  labelKey: 'this_week',
  value: {
    start: addDays(startOfWeek(today), 1),
    end: addDays(endOfWeek(today), 1)
  }
};

/** Preset: next week (Monday-based, shifted one week forward). */
export const nextWeekPreset: DatePreset = {
  labelKey: 'next_week',
  value: {
    start: addDays(startOfWeek(today), 8),
    end: addDays(endOfWeek(today), 8)
  }
};

/** Preset: this month. */
export const thisMonthPreset: DatePreset = {
  labelKey: 'this_month',
  value: { start: startOfMonth(today), end: endOfMonth(today) }
};

/** Preset: this week with explicit weekStartsOn=1 (session filter). */
export const sessionThisWeekPreset: DatePreset = {
  labelKey: 'this_week',
  value: {
    start: startOfWeek(today, { weekStartsOn: 1 }),
    end: endOfWeek(today, { weekStartsOn: 1 })
  }
};

/** Preset: next week with explicit weekStartsOn=1 (session filter). */
export const sessionNextWeekPreset: DatePreset = {
  labelKey: 'next_week',
  value: {
    start: startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }),
    end: endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
  }
};

/** Preset: previous week (session filter, past view). */
export const pastWeekPreset: DatePreset = {
  labelKey: 'past_week',
  value: {
    start: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
    end: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
  }
};

/** Preset: previous month (session filter, past view). */
export const pastMonthPreset: DatePreset = {
  labelKey: 'past_month',
  value: {
    start: startOfMonth(subMonths(today, 1)),
    end: endOfMonth(subMonths(today, 1))
  }
};

/** Session filter presets for upcoming dates. */
export const filterContentListUpcomingDate: DatePreset[] = [
  fullDayTodayPreset,
  sessionThisWeekPreset,
  sessionNextWeekPreset
];

/** Session filter presets for past dates. */
export const filterContentListPastDate: DatePreset[] = [
  fullDayTodayPreset,
  pastWeekPreset,
  pastMonthPreset
];

/** Clinic filter date presets. */
export const filterContentListClinicDate: DatePreset[] = [
  todayPreset,
  thisWeekPreset,
  nextWeekPreset
];

/** Record filter date presets. */
export const filterContentListRecordDate: DatePreset[] = [
  todayPreset,
  thisWeekPreset,
  thisMonthPreset
];

/** A time-slot entry: display label plus start/end time strings. */
export interface TimeSlotPreset {
  readonly label: string;
  readonly value: { readonly start: string; readonly end: string };
}

/** Shared time-slot presets for session and clinic filters. */
export const filterContentListTime: TimeSlotPreset[] = [
  { label: '07:00 - 10:00', value: { start: '07:00', end: '10:00' } },
  { label: '10:00 - 13:00', value: { start: '10:00', end: '13:00' } },
  { label: '13:00 - 16:00', value: { start: '13:00', end: '16:00' } },
  { label: '16:00 - 18:00', value: { start: '16:00', end: '18:00' } },
  { label: '18:00 - 22:00', value: { start: '18:00', end: '22:00' } }
];

/**
 * Translate preset labelKeys into display labels.
 *
 * @param t - Translation function from useTranslations('common').
 * @param presets - Presets whose labelKeys should be localized.
 * @returns Presets with translated labels, same values.
 */
export function localizeDatePresets(
  t: (key: string) => string,
  presets: DatePreset[]
): { label: string; value: { start: Date; end: Date } }[] {
  return presets.map(preset => ({
    label: t(preset.labelKey),
    value: preset.value
  }));
}
