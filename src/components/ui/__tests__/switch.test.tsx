import { Switch } from '@/components/ui/switch';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Switch', () => {
  it('renders with bg-secondary (teal) track when checked', () => {
    render(<Switch checked={true} onCheckedChange={vi.fn()} />);

    const root = screen.getByRole('switch');
    expect(root).toHaveClass('data-[state=checked]:bg-secondary');
  });

  it('renders with bg-gray-400 track when unchecked', () => {
    render(<Switch checked={false} onCheckedChange={vi.fn()} />);

    const root = screen.getByRole('switch');
    expect(root).toHaveClass('data-[state=unchecked]:bg-gray-400');
  });
});
