import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();

const { mockLocale } = vi.hoisted(() => ({
  mockLocale: { current: 'en' }
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'common.journal.success_title': 'Stay Motivated Today!',
        'common.journal.success_description':
          'Writing a journal is an important step to understand yourself and maintain your mental health.',
        'common.journal.back': 'Back'
      },
      id: {
        'common.journal.success_title': 'Tetap Termotivasi Hari Ini!',
        'common.journal.success_description':
          'Menulis jurnal adalah langkah penting untuk memahami diri sendiri dan menjaga kesehatan mental Anda.',
        'common.journal.back': 'Kembali'
      }
    };
    return translations[mockLocale.current]?.[`${namespace}.${key}`] ?? key;
  })
}));

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
    <img alt='' {...props} />
  )
}));

import JournalSuccessDrawer from '../journal-succes-drawer';

describe('JournalSuccessDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale.current = 'en';
  });

  it('renders when isOpen is true', () => {
    render(<JournalSuccessDrawer isOpen onClose={vi.fn()} />);
    expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<JournalSuccessDrawer isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('mock-drawer')).toBeNull();
  });

  it('navigates to viewRoute when provided and Back is clicked', () => {
    render(
      <JournalSuccessDrawer
        isOpen
        onClose={vi.fn()}
        viewRoute='/record?view=Observation/obs-123'
      />
    );

    fireEvent.click(screen.getByText('Back'));
    expect(mockPush).toHaveBeenCalledWith('/record?view=Observation/obs-123');
  });

  it('navigates to /record when no viewRoute is provided and Back is clicked', () => {
    render(<JournalSuccessDrawer isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Back'));
    expect(mockPush).toHaveBeenCalledWith('/record');
  });

  it('renders the localized copy under id', () => {
    mockLocale.current = 'id';
    render(<JournalSuccessDrawer isOpen onClose={vi.fn()} />);

    expect(screen.getByText('Tetap Termotivasi Hari Ini!')).toBeInTheDocument();
    expect(
      screen.getByText(/menulis jurnal adalah langkah penting/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Kembali'));
    expect(mockPush).toHaveBeenCalledWith('/record');
  });
});
