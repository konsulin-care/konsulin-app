import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup, RadioGroupItem } from '../radio-group';

describe('RadioGroup', () => {
  it('applies token classes to the item', () => {
    render(
      <RadioGroup>
        <RadioGroupItem value='a' aria-label='Option A' />
      </RadioGroup>
    );
    const item = screen.getByRole('radio');
    expect(item.className).toContain('border-input');
    expect(item.className).toContain('text-foreground');
    expect(item.className).toContain('data-[state=checked]:bg-accent');
    expect(item.className).toContain(
      'data-[state=checked]:border-turquoise-deep'
    );
  });

  it('reflects the checked state', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup onValueChange={onValueChange}>
        <RadioGroupItem value='a' aria-label='Option A' />
      </RadioGroup>
    );
    const item = screen.getByRole('radio');
    expect(item).toHaveAttribute('data-state', 'unchecked');
    await user.click(item);
    expect(item).toHaveAttribute('data-state', 'checked');
    expect(onValueChange).toHaveBeenCalledWith('a');
  });
});
