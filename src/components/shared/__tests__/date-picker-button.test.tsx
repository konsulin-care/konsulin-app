import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLocale } = vi.hoisted(() => ({
  mockLocale: { current: 'en' }
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'common.date_picker.pick_a_date': 'Pick a date',
        'common.date_picker.select_date': 'Select Date'
      },
      id: {
        'common.date_picker.pick_a_date': 'Pilih tanggal',
        'common.date_picker.select_date': 'Pilih Tanggal'
      }
    };
    return translations[mockLocale.current]?.[`${namespace}.${key}`] ?? key;
  })
}));

vi.mock('@/components/ui/app-drawer', () => ({
  default: ({
    children,
    open,
    title
  }: {
    children: React.ReactNode;
    open: boolean;
    title?: string;
  }) => (
    <div data-testid='drawer-root' data-open={open}>
      {title && <div data-testid='drawer-title'>{title}</div>}
      {open && children}
    </div>
  )
}));

vi.mock('@/components/ui/calendar-base', () => ({
  CalendarBase: ({
    mode,
    onSelect
  }: {
    mode: string;
    onSelect?: (date: unknown) => void;
  }) => (
    <div data-testid='calendar-base' data-mode={mode}>
      <button type='button' onClick={() => onSelect?.(new Date('2026-03-15'))}>
        Select Mar 15
      </button>
    </div>
  )
}));

import DatePickerButton from '../date-picker-button';

/** Render DatePickerButton with an undefined value unless overridden. */
function renderDatePickerButton(
  overrides: Partial<React.ComponentProps<typeof DatePickerButton>> = {}
) {
  return render(
    <DatePickerButton value={undefined} onChange={vi.fn()} {...overrides} />
  );
}

describe('DatePickerButton', () => {
  beforeEach(() => {
    mockLocale.current = 'en';
  });

  it.each([
    { locale: 'en', placeholder: 'Pick a date' },
    { locale: 'id', placeholder: 'Pilih tanggal' }
  ])(
    'renders the localized placeholder under $locale',
    ({ locale, placeholder }) => {
      mockLocale.current = locale;
      renderDatePickerButton();
      expect(screen.getByText(placeholder)).toBeInTheDocument();
    }
  );

  it.each([
    { locale: 'en', buttonName: /pick a date/i, title: 'Select Date' },
    { locale: 'id', buttonName: /pilih tanggal/i, title: 'Pilih Tanggal' }
  ])(
    'renders the localized drawer title under $locale',
    ({ locale, buttonName, title }) => {
      mockLocale.current = locale;
      renderDatePickerButton();
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      expect(screen.getByTestId('drawer-title')).toHaveTextContent(title);
    }
  );

  it('renders custom placeholder text', () => {
    renderDatePickerButton({ placeholder: 'Select start date' });
    expect(screen.getByText('Select start date')).toBeInTheDocument();
  });

  it('renders formatted date when value is provided', () => {
    renderDatePickerButton({ value: new Date('2026-03-15') });
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument();
  });

  it('opens drawer when button is clicked', () => {
    renderDatePickerButton();
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    expect(screen.getByTestId('drawer-root')).toHaveAttribute(
      'data-open',
      'true'
    );
  });

  it('closes drawer and calls onChange when a date is selected', () => {
    const onChange = vi.fn();
    renderDatePickerButton({ onChange });
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    fireEvent.click(screen.getByText('Select Mar 15'));
    expect(onChange).toHaveBeenCalledWith(new Date('2026-03-15'));
  });

  it('renders calendar in single mode', () => {
    renderDatePickerButton();
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    expect(screen.getByTestId('calendar-base')).toHaveAttribute(
      'data-mode',
      'single'
    );
  });

  it('disables the button when disabled prop is true', () => {
    renderDatePickerButton({ disabled: true });
    expect(screen.getByRole('button', { name: /pick a date/i })).toBeDisabled();
  });

  it('does not open drawer when disabled button is clicked', () => {
    renderDatePickerButton({ disabled: true });
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    expect(screen.getByTestId('drawer-root')).toHaveAttribute(
      'data-open',
      'false'
    );
  });
});

describe('DatePickerButton - controlled state', () => {
  function ControlledHarness() {
    const [date, setDate] = useState<Date | undefined>(undefined);
    return (
      <div>
        <DatePickerButton value={date} onChange={setDate} />
        {date && <span data-testid='selected-date'>{date.toISOString()}</span>}
      </div>
    );
  }

  it('updates the displayed date after selection', () => {
    render(<ControlledHarness />);
    expect(screen.getByText('Pick a date')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    fireEvent.click(screen.getByText('Select Mar 15'));
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument();
  });
});
