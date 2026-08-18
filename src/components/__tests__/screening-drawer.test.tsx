/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import type { InterviewResult } from '@/types/recommendation-interview';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPush, mockPathname, mockSave, mockOnComplete, mockOnClose } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockPathname: vi.fn(() => '/'),
    mockSave: vi.fn(() => Promise.resolve()),
    mockOnComplete: vi.fn(),
    mockOnClose: vi.fn()
  }));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush })
}));

vi.mock('@/utils/recommendation-interview', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, saveLastInterviewResult: mockSave };
});

// Stub the generic drawer to a plain container so the test focuses on the
// screening orchestration, not the Vaul internals.
vi.mock('@/components/ui/app-drawer', () => ({
  default: ({
    open,
    onClose,
    children,
    ctaLabel,
    ctaDisabled,
    onCtaClick,
    footerContent
  }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    ctaLabel?: string;
    ctaDisabled?: boolean;
    onCtaClick?: () => void;
    footerContent?: React.ReactNode;
  }) =>
    open ? (
      <div data-testid='app-drawer'>
        <button onClick={onClose}>close</button>
        {children}
        {ctaLabel && (
          <button
            data-testid='primary-cta'
            disabled={ctaDisabled}
            onClick={() => onCtaClick?.()}
          >
            {ctaLabel}
          </button>
        )}
        {footerContent && (
          <div data-testid='footer-content'>{footerContent}</div>
        )}
      </div>
    ) : null
}));

const RESULT: InterviewResult = {
  complaintId: 'low-mood',
  complaintLabel: 'Low mood',
  specialty: 'psychiatry',
  serviceTypeCode: 'mood-disorder-care',
  icfDomain: 'mental-emotional-health' as const,
  redFlag: {
    isEmergency: false,
    label: 'Are you safe?',
    resources: []
  }
};

// Stub InterviewAccordion to drive the complete flow
vi.mock('@/components/general/home/interview/interview-accordion', () => ({
  InterviewAccordion: ({
    onComplete
  }: {
    onComplete: (result: InterviewResult) => void;
  }) => <button onClick={() => onComplete(RESULT)}>complete interview</button>
}));

import ScreeningDrawer from '../screening-drawer';

beforeEach(() => {
  mockPathname.mockReturnValue('/');
  vi.clearAllMocks();
});

describe('ScreeningDrawer', () => {
  it('renders nothing when closed', () => {
    render(<ScreeningDrawer open={false} onClose={mockOnClose} />);
    expect(screen.queryByTestId('app-drawer')).toBeNull();
  });

  it('renders the accordion when open', () => {
    render(<ScreeningDrawer open onClose={mockOnClose} />);
    expect(screen.getByText('complete interview')).toBeInTheDocument();
  });

  it('renders primary CTA as disabled initially', () => {
    render(<ScreeningDrawer open onClose={mockOnClose} />);
    const cta = screen.getByTestId('primary-cta');
    expect(cta).toHaveTextContent('Get Recommendation');
    expect(cta).toBeDisabled();
  });

  it('renders secondary emergency CTA in footer', () => {
    render(<ScreeningDrawer open onClose={mockOnClose} />);
    const footer = screen.getByTestId('footer-content');
    expect(footer).toHaveTextContent('Emergency Line');
  });

  it('enables CTA after accordion completes and submits on CTA click', async () => {
    render(
      <ScreeningDrawer open onComplete={mockOnComplete} onClose={mockOnClose} />
    );
    // Accordion completes — stores pending result, CTA enables
    fireEvent.click(screen.getByText('complete interview'));
    await waitFor(() => {
      expect(screen.getByTestId('primary-cta')).toBeEnabled();
    });
    // Click CTA to submit
    fireEvent.click(screen.getByTestId('primary-cta'));
    expect(mockSave).toHaveBeenCalledWith(RESULT);
    expect(mockOnComplete).toHaveBeenCalledWith(RESULT);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('routes to /recommendation when on a non-home page', async () => {
    mockPathname.mockReturnValue('/clinic');
    render(
      <ScreeningDrawer open onComplete={mockOnComplete} onClose={mockOnClose} />
    );
    fireEvent.click(screen.getByText('complete interview'));
    await waitFor(() => {
      expect(screen.getByTestId('primary-cta')).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId('primary-cta'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/recommendation');
    });
  });

  it('does not route when already on homepage', async () => {
    mockPathname.mockReturnValue('/');
    render(
      <ScreeningDrawer open onComplete={mockOnComplete} onClose={mockOnClose} />
    );
    fireEvent.click(screen.getByText('complete interview'));
    await waitFor(() => {
      expect(screen.getByTestId('primary-cta')).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId('primary-cta'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not route when already on /recommendation', async () => {
    mockPathname.mockReturnValue('/recommendation');
    render(
      <ScreeningDrawer open onComplete={mockOnComplete} onClose={mockOnClose} />
    );
    fireEvent.click(screen.getByText('complete interview'));
    await waitFor(() => {
      expect(screen.getByTestId('primary-cta')).toBeEnabled();
    });
    fireEvent.click(screen.getByTestId('primary-cta'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('resets accordion state after drawer is dismissed', () => {
    const { rerender } = render(<ScreeningDrawer open onClose={mockOnClose} />);
    expect(screen.getByText('complete interview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    rerender(<ScreeningDrawer open onClose={mockOnClose} />);
    // Should show the accordion again (fresh state)
    expect(screen.getByText('complete interview')).toBeInTheDocument();
  });
});
