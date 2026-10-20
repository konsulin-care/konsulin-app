import DatePickerButton from '@/components/shared/date-picker-button';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

export { mockLocale } from './date-picker-button-test-mocks';

/**
 * Render DatePickerButton with an undefined value unless overridden.
 *
 * @param overrides - Props to replace on top of the defaults.
 * @returns The RTL render result.
 */
export function renderDatePickerButton(
  overrides: Partial<React.ComponentProps<typeof DatePickerButton>> = {}
): RenderResult {
  return render(
    <DatePickerButton value={undefined} onChange={vi.fn()} {...overrides} />
  );
}
