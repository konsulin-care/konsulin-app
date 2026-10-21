import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLocale } = vi.hoisted(() => ({
  mockLocale: { current: 'id' }
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      id: {
        'common.day': 'TT',
        'common.month': 'Bulan',
        'common.year': 'YYYY',
        'common.day_label': 'Tanggal',
        'common.month_label': 'Bulan',
        'common.year_label': 'Tahun',
        'common.months.january': 'Januari',
        'common.months.february': 'Februari',
        'common.months.march': 'Maret',
        'common.months.april': 'April',
        'common.months.may': 'Mei',
        'common.months.june': 'Juni',
        'common.months.july': 'Juli',
        'common.months.august': 'Agustus',
        'common.months.september': 'September',
        'common.months.october': 'Oktober',
        'common.months.november': 'November',
        'common.months.december': 'Desember'
      },
      en: {
        'common.day': 'DD',
        'common.month': 'Month',
        'common.year': 'YYYY',
        'common.day_label': 'Day',
        'common.month_label': 'Month',
        'common.year_label': 'Year',
        'common.months.january': 'January',
        'common.months.february': 'February',
        'common.months.march': 'March',
        'common.months.april': 'April',
        'common.months.may': 'May',
        'common.months.june': 'June',
        'common.months.july': 'July',
        'common.months.august': 'August',
        'common.months.september': 'September',
        'common.months.october': 'October',
        'common.months.november': 'November',
        'common.months.december': 'December'
      }
    };
    return translations[mockLocale.current]?.[`${namespace}.${key}`] ?? key;
  })
}));

import DobInput from '../dob-input';

/** aria-label values per locale as rendered by the mocked translations. */
const ARIA_LABELS = {
  id: { day: 'Tanggal', month: 'Bulan', year: 'Tahun' },
  en: { day: 'Day', month: 'Month', year: 'Year' }
} as const;

describe('DobInput', () => {
  beforeEach(() => {
    mockLocale.current = 'id';
  });

  it('shows Indonesian aria-labels and month names under id', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    const { day, month, year } = ARIA_LABELS.id;

    const daySelect = screen.getByRole('combobox', { name: day });
    expect(daySelect).toHaveTextContent('TT');

    const monthSelect = screen.getByRole('combobox', { name: month });
    expect(monthSelect).toHaveTextContent('Bulan');
    expect(monthSelect).toHaveTextContent('Januari');
    expect(monthSelect).toHaveTextContent('Desember');

    const yearSelect = screen.getByRole('combobox', { name: year });
    expect(yearSelect).toHaveTextContent('YYYY');
  });

  it('shows English aria-labels and month names under en', () => {
    mockLocale.current = 'en';
    render(<DobInput value='' onChange={vi.fn()} />);
    const { day, month, year } = ARIA_LABELS.en;

    const daySelect = screen.getByRole('combobox', { name: day });
    expect(daySelect).toHaveTextContent('DD');

    const monthSelect = screen.getByRole('combobox', { name: month });
    expect(monthSelect).toHaveTextContent('Month');
    expect(monthSelect).toHaveTextContent('January');
    expect(monthSelect).toHaveTextContent('December');

    const yearSelect = screen.getByRole('combobox', { name: year });
    expect(yearSelect).toHaveTextContent('YYYY');
  });

  it('calls onChange with formatted date when all parts are selected', async () => {
    mockLocale.current = 'en';
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DobInput value='' onChange={onChange} />);

    const { day, month, year } = ARIA_LABELS.en;
    await user.selectOptions(screen.getByRole('combobox', { name: day }), '15');
    await user.selectOptions(
      screen.getByRole('combobox', { name: month }),
      'march'
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: year }),
      '1990'
    );

    expect(onChange).toHaveBeenCalledWith('1990-03-15');
  });
});
