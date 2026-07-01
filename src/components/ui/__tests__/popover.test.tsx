import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('PopoverContent', () => {
  it('renders with a solid white background (not dependent on CSS variables)', () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    );

    // PopoverContent renders in a Portal; query by data-side attribute (exclusive to content)
    const contentEl = document.querySelector('[data-side]');
    expect(contentEl).not.toBeNull();
    const allClasses = contentEl.className;
    expect(allClasses).toContain('bg-white');
    expect(allClasses).toContain('text-gray-900');
  });

  it('renders content children', () => {
    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Hello World</PopoverContent>
      </Popover>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
