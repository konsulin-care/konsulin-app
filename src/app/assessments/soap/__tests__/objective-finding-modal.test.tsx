import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt='note' data-testid='note-icon' />
  )
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerClose: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  )
}));

import ObjectiveFindingModal from '../objective-finding-modal';

describe('ObjectiveFindingModal', () => {
  it('toggles a test on: aria-pressed flips to true and onChange receives the added item', () => {
    const onChange = vi.fn();
    render(
      <ObjectiveFindingModal
        objectiveFinding={[false, true, false]}
        onChange={onChange}
      />
    );

    const toggle = screen.getByRole('button', {
      name: 'Toggle BIG 5 Personality Test'
    });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([
      { id: 1, name: 'BIG 5 Personality Test' },
      { id: 2, name: 'BIG 4 Personality Test' }
    ]);
  });

  it('toggles a test off on second click: aria-pressed flips back and onChange receives empty list', () => {
    const onChange = vi.fn();
    render(
      <ObjectiveFindingModal
        objectiveFinding={[true, false, false]}
        onChange={onChange}
      />
    );

    const toggle = screen.getByRole('button', {
      name: 'Toggle BIG 5 Personality Test'
    });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([]);
  });
});
