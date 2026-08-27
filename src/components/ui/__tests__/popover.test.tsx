import { DrawerContentContext } from '@/components/ui/drawer';
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

  it('portals into the drawer content node when DrawerContentContext is present', () => {
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'drawer-container');
    document.body.appendChild(container);

    render(
      <DrawerContentContext.Provider value={container}>
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Inside Drawer</PopoverContent>
        </Popover>
      </DrawerContentContext.Provider>
    );

    // The popover content must be mounted inside the drawer container, not body.
    expect(container.querySelector('[data-side]')).not.toBeNull();

    document.body.removeChild(container);
  });

  it('falls back to document.body when no DrawerContentContext is present', () => {
    const container = document.createElement('div');
    container.setAttribute('data-testid', 'drawer-container');
    document.body.appendChild(container);

    render(
      <DrawerContentContext.Provider value={null}>
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Standalone</PopoverContent>
        </Popover>
      </DrawerContentContext.Provider>
    );

    // Without a container, content portals to body and must NOT be inside container.
    expect(container.querySelector('[data-side]')).toBeNull();

    document.body.removeChild(container);
  });
});
