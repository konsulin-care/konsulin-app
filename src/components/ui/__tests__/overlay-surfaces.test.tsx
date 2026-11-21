import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('overlay surfaces', () => {
  it('renders an open DropdownMenuContent with the popover surface tokens', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    // DropdownMenuContent renders in a Portal; query by role (exclusive to menu content)
    const contentEl = document.querySelector('[role="menu"]');
    expect(contentEl).not.toBeNull();
    const allClasses = contentEl?.className ?? '';
    expect(allClasses).toContain('bg-popover');
    expect(allClasses).not.toContain('bg-white');
  });

  it('renders a Card as a hairline surface without shadow-sm', () => {
    render(<Card data-testid='card'>Body</Card>);

    const cardEl = screen.getByTestId('card');
    const allClasses = cardEl.className;
    expect(allClasses).toContain('rounded-lg');
    expect(allClasses).toContain('border');
    expect(allClasses).toContain('bg-card');
    expect(allClasses).not.toContain('shadow-sm');
  });
});
