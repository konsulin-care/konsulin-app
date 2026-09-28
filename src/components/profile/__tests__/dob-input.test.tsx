import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => {
    const translations: Record<string, string> = {
      'common.day': 'TT',
      'common.month': 'Bulan',
      'common.year': 'YYYY',
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
    };
    return translations[`${namespace}.${key}`] ?? key;
  })
}));

import DobInput from '../dob-input';

describe('DobInput', () => {
  it('renders translated day placeholder', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    const daySelect = screen.getByRole('combobox', { name: 'Day' });
    expect(daySelect).toHaveTextContent('TT');
  });

  it('renders translated month placeholder', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    const monthSelect = screen.getByRole('combobox', { name: 'Month' });
    expect(monthSelect).toHaveTextContent('Bulan');
  });

  it('renders translated year placeholder', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    const yearSelect = screen.getByRole('combobox', { name: 'Year' });
    expect(yearSelect).toHaveTextContent('YYYY');
  });

  it('renders translated month names', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    const monthSelect = screen.getByRole('combobox', { name: 'Month' });
    expect(monthSelect).toHaveTextContent('Januari');
    expect(monthSelect).toHaveTextContent('Desember');
  });

  it('calls onChange with formatted date when all parts are selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DobInput value='' onChange={onChange} />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Day' }),
      '15'
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Month' }),
      'march'
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Year' }),
      '1990'
    );

    expect(onChange).toHaveBeenCalledWith('1990-03-15');
  });
});
