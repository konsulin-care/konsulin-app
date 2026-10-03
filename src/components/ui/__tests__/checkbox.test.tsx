import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  it.each([
    [true, 'checked', ['bg-secondary', 'text-white', 'border-secondary']],
    [false, 'unchecked', []]
  ])(
    'applies correct state and classes when checked=%s',
    (checked, expectedState, expectedClasses) => {
      render(<Checkbox checked={checked} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('data-state', expectedState);
      for (const cls of expectedClasses) {
        expect(checkbox.className).toContain(cls);
      }
    }
  );

  it('toggles on click', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
