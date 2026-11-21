import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { Input } from '../input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../select';
import { Textarea } from '../textarea';

// Radix Select calls these browser APIs that jsdom does not implement.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

describe('Form fields', () => {
  it('renders Input with card surface and ring tokens', () => {
    render(<Input aria-label='field' />);
    const input = screen.getByLabelText('field');
    expect(input.className).toContain('h-11');
    expect(input.className).toContain('rounded-lg');
    expect(input.className).toContain('border-input');
    expect(input.className).toContain('bg-card');
    expect(input.className).toContain('focus-visible:ring-ring');
  });

  it('renders Textarea with card surface and no fixed input height', () => {
    render(<Textarea aria-label='notes' />);
    const textarea = screen.getByLabelText('notes');
    expect(textarea.className).toContain('min-h-20');
    expect(textarea.className).toContain('rounded-lg');
    expect(textarea.className).toContain('border-input');
    expect(textarea.className).toContain('bg-card');
    expect(textarea.className).not.toContain('h-11');
  });

  it('renders SelectTrigger and open SelectContent with token surfaces', () => {
    render(
      <Select open defaultValue='a'>
        <SelectTrigger aria-label='choice'>A</SelectTrigger>
        <SelectContent>
          <SelectItem value='a'>Option A</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = document.querySelector('[role="combobox"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.className).toContain('h-11');
    expect(trigger?.className).toContain('rounded-lg');
    expect(trigger?.className).toContain('bg-card');

    const content = document.querySelector('[class*="bg-popover"]');
    expect(content).not.toBeNull();
    expect(content?.className).not.toContain('bg-white');
  });
});
