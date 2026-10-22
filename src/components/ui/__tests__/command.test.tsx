import {
  Command,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('CommandList', () => {
  it('stops wheel events from reaching document-level listeners (RemoveScroll)', () => {
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem value='a'>Item A</CommandItem>
          <CommandItem value='b'>Item B</CommandItem>
        </CommandList>
      </Command>
    );

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const docWheelHandler = vi.fn();
    document.addEventListener('wheel', docWheelHandler);

    fireEvent.wheel(listbox, { deltaY: 100 });

    expect(docWheelHandler).not.toHaveBeenCalled();

    document.removeEventListener('wheel', docWheelHandler);
  });

  it('stops touchmove events from reaching document-level listeners (RemoveScroll)', () => {
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem value='a'>Item A</CommandItem>
          <CommandItem value='b'>Item B</CommandItem>
        </CommandList>
      </Command>
    );

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const docTouchMoveHandler = vi.fn();
    document.addEventListener('touchmove', docTouchMoveHandler);

    fireEvent.touchMove(listbox, { changedTouches: [{ pageY: 100 }] });

    expect(docTouchMoveHandler).not.toHaveBeenCalled();

    document.removeEventListener('touchmove', docTouchMoveHandler);
  });
});
