import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush }))
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid='mock-drawer'>{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt='' {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
  )
}));

import JournalSuccessDrawer from '../journal-succes-drawer';

describe('JournalSuccessDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<JournalSuccessDrawer isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<JournalSuccessDrawer isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('mock-drawer')).toBeNull();
  });

  it('navigates to viewRoute when provided and Back is clicked', () => {
    render(
      <JournalSuccessDrawer
        isOpen={true}
        onClose={vi.fn()}
        viewRoute='/record?view=Observation/obs-123'
      />
    );

    fireEvent.click(screen.getByText('Back'));
    expect(mockPush).toHaveBeenCalledWith('/record?view=Observation/obs-123');
  });

  it('navigates to /record when no viewRoute is provided and Back is clicked', () => {
    render(<JournalSuccessDrawer isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Back'));
    expect(mockPush).toHaveBeenCalledWith('/record');
  });
});
