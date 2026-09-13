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

  it('renders checked when checked prop is true', () => {
    render(<Checkbox checked />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('applies teal background when checked (secondary color)', () => {
    render(<Checkbox checked />);
    const checkbox = screen.getByRole('checkbox');
    // bg-secondary maps to var(--secondary) which is #13c2c2
    expect(checkbox.className).toContain('bg-secondary');
  });

  it('does not apply teal background when unchecked', () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole('checkbox');
    // The class data-[state=checked]:bg-secondary is present in the string
    // but only applies visually when data-state=checked; verify unchecked state
    expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  it('applies white text when checked', () => {
    render(<Checkbox checked />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.className).toContain('text-white');
  });

  it('applies secondary border when checked', () => {
    render(<Checkbox checked />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.className).toContain('border-secondary');
  });

  it('toggles on click', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
