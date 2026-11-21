import { Switch } from '@/components/ui/switch';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Switch', () => {
  it('renders with bg-turquoise-deep track when checked', () => {
    render(<Switch checked onCheckedChange={vi.fn()} />);

    const root = screen.getByRole('switch');
    expect(root).toHaveClass('data-[state=checked]:bg-turquoise-deep');
    expect(root).not.toHaveClass('data-[state=checked]:bg-secondary');
  });

  it('renders with bg-charcoal-400 track when unchecked', () => {
    render(<Switch checked={false} onCheckedChange={vi.fn()} />);

    const root = screen.getByRole('switch');
    expect(root).toHaveClass('data-[state=unchecked]:bg-charcoal-400');
    expect(root).not.toHaveClass('bg-gray-400');
  });

  it('renders the thumb with bg-surface by default', () => {
    render(<Switch checked onCheckedChange={vi.fn()} />);

    const thumb = screen.getByRole('switch').firstElementChild;
    expect(thumb).toHaveClass('bg-surface');
  });

  it('renders the thumb with the thumbColor class when provided', () => {
    render(
      <Switch checked thumbColor='bg-primary' onCheckedChange={vi.fn()} />
    );

    const thumb = screen.getByRole('switch').firstElementChild;
    expect(thumb).toHaveClass('bg-primary');
    expect(thumb).not.toHaveClass('bg-surface');
  });
});
