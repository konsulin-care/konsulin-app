import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
    expect(drawerEl).toHaveClass('overflow-y-auto');
  });
});
