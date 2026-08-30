import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState as ReactUseState } from 'react';
import { describe, expect, it } from 'vitest';

describe('DrawerHeader', () => {
  it('centers title and description text on all screen sizes', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Centered Title</DrawerTitle>
            <DrawerDescription>Centered Description</DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    );

    const header = screen.getByText('Centered Title').parentElement;
    expect(header?.className).toContain('text-center');
    expect(header?.className).not.toContain('sm:text-left');
  });
});

describe('DrawerContent', () => {
  it('renders children within a scrollable container capped at 85dvh', () => {
    render(
      <Drawer open>
        <DrawerContent>
          <DrawerTitle>Test Title</DrawerTitle>
          <DrawerDescription>Test Description</DrawerDescription>
          <div data-testid='drawer-body'>Body content</div>
        </DrawerContent>
      </Drawer>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-body')).toHaveTextContent('Body content');

    // Vaul renders via portal, so content is in document.body
    const drawerEl = document.querySelector('[data-vaul-drawer]');
    expect(drawerEl).toBeInTheDocument();
    expect(drawerEl).toHaveClass('max-h-[85dvh]');
    expect(drawerEl).toHaveClass('mx-auto');
    expect(drawerEl).toHaveClass('max-w-screen-sm');
    expect(drawerEl).not.toHaveClass('overflow-y-auto');

    // overflow-y-auto is on the inner scroll wrapper, not on [data-vaul-drawer]
    // (Vaul's ::after pseudo-element on the outer element would otherwise create blank space)
    const innerWrapper = drawerEl?.lastElementChild;
    expect(innerWrapper).toHaveClass('overflow-y-auto');
  });

  it('portals a nested Popover content into the drawer content node', async () => {
    render(
      <Drawer open>
        <DrawerContent>
          <Popover open>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>Popover Body</PopoverContent>
          </Popover>
        </DrawerContent>
      </Drawer>
    );

    const drawerEl = document.querySelector('[data-vaul-drawer]');
    expect(drawerEl).not.toBeNull();

    // The popover content must land inside the drawer content node (not body),
    // so it participates in the drawer's modal interaction model.
    const popoverContent = await screen.findByText('Popover Body');
    expect(drawerEl?.contains(popoverContent)).toBe(true);
  });

  it('registers a combobox item selection inside a drawer mount', async () => {
    const selections: string[] = [];

    function DrawerCombobox() {
      const [open, setOpen] = ReactUseState(true);
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger>Select</PopoverTrigger>
          <PopoverContent>
            {['Option A', 'Option B'].map(option => (
              <button
                key={option}
                type='button'
                onClick={() => {
                  selections.push(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      );
    }

    render(
      <Drawer open>
        <DrawerContent>
          <DrawerCombobox />
        </DrawerContent>
      </Drawer>
    );

    const option = await screen.findByText('Option A');
    fireEvent.click(option);

    expect(selections).toEqual(['Option A']);
  });

  it('keeps the overlay mounted below the content across hideOverlay toggles', () => {
    function OverlayToggleHarness() {
      const [hideOverlay, setHideOverlay] = ReactUseState(false);
      return (
        <div>
          <Drawer open>
            <DrawerContent hideOverlay={hideOverlay}>
              <DrawerTitle>Toggle Title</DrawerTitle>
            </DrawerContent>
          </Drawer>
          <button
            type='button'
            data-testid='toggle-overlay'
            onClick={() => {
              setHideOverlay(value => !value);
            }}
          >
            toggle-overlay
          </button>
        </div>
      );
    }

    const overlayNode = () => document.querySelector('[data-vaul-overlay]');
    const contentNode = () => document.querySelector('[data-vaul-drawer]');
    const bodyChildIndex = (element: Element | null): number => {
      if (!element) return -1;
      return Array.from(document.body.children).indexOf(element);
    };

    render(<OverlayToggleHarness />);

    expect(overlayNode()).not.toBeNull();
    expect(bodyChildIndex(overlayNode())).toBeLessThan(
      bodyChildIndex(contentNode())
    );

    fireEvent.click(screen.getByTestId('toggle-overlay'));
    expect(overlayNode()).not.toBeNull();
    expect(overlayNode()).toHaveClass('invisible');
    expect(bodyChildIndex(overlayNode())).toBeLessThan(
      bodyChildIndex(contentNode())
    );

    fireEvent.click(screen.getByTestId('toggle-overlay'));
    expect(overlayNode()).not.toBeNull();
    expect(overlayNode()).not.toHaveClass('invisible');
    expect(bodyChildIndex(overlayNode())).toBeLessThan(
      bodyChildIndex(contentNode())
    );
  });
});
