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

  it('uses input and card tokens for the unchecked surface', () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.className).toContain('border-input');
    expect(checkbox.className).toContain('bg-card');
    expect(checkbox.className).not.toContain('border-[#D1D5DB]');
    expect(checkbox.className).not.toContain('bg-white');
  });

  it.each([
    [
      true,
      'checked',
      [
        'data-[state=checked]:bg-accent',
        'data-[state=checked]:border-turquoise-deep',
        'data-[state=checked]:text-foreground'
      ]
    ],
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
      expect(checkbox.className).not.toContain('text-white');
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
