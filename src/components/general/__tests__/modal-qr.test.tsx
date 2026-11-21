import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Polyfill setPointerCapture for vaul drawer (jsdom missing)
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {
    /* noop */
  };
}

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

// Mock react-qr-code
vi.mock('react-qr-code', () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid='qr-code' data-value={value} />
  )
}));

// Mock clipboard utility — jsdom's navigator.clipboard is not mockable
vi.mock('@/utils/clipboard', () => ({
  writeClipboard: vi.fn(() => Promise.resolve())
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      common: {
        'qr.copy_link': 'Copy Link',
        'qr.show': 'Show QR'
      },
      toast: {
        qr_copy_success: 'Link copied to clipboard',
        qr_copy_error: 'Error copying to clipboard'
      }
    };
    return translations[namespace]?.[key] ?? key;
  })
}));

import { writeClipboard } from '@/utils/clipboard';
import { toast } from 'react-toastify';
import ModalQr from '../modal-qr';

const noop = (): void => {
  /* noop */
};

describe('ModalQr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button in uncontrolled mode', () => {
    render(<ModalQr value='https://example.com' />);
    expect(screen.getByText('Show QR')).toBeInTheDocument();
  });

  it('styles the uncontrolled trigger as a charcoal primary action', () => {
    render(<ModalQr value='https://example.com' />);
    const trigger = screen.getByRole('button', { name: 'Show QR' });

    expect(trigger.className).toContain('bg-primary');
    expect(trigger.className).toContain('text-primary-foreground');
    expect(trigger.className).not.toContain('text-white');
    expect(trigger.className).not.toContain('bg-secondary');
    expect(trigger.className).not.toContain('rounded-xl');
  });

  it('renders QR code when controlled open is true', () => {
    render(<ModalQr value='https://example.com' open onOpenChange={noop} />);
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code')).toHaveAttribute(
      'data-value',
      'https://example.com'
    );
  });

  it('hides QR code when controlled open is false', () => {
    render(
      <ModalQr value='https://example.com' open={false} onOpenChange={noop} />
    );
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });

  it('calls onOpenChange(false) when Copy Link is clicked in controlled mode', async () => {
    const onOpenChange = vi.fn();
    render(
      <ModalQr value='https://example.com' open onOpenChange={onOpenChange} />
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Copy Link'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('copies value to clipboard when Copy Link is clicked', async () => {
    render(<ModalQr value='https://test.url' open onOpenChange={noop} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Copy Link'));
    expect(vi.mocked(writeClipboard)).toHaveBeenCalledWith('https://test.url');
  });

  it('styles the Copy Link button as a primary action', () => {
    render(<ModalQr value='https://example.com' open onOpenChange={noop} />);
    const copy = screen.getByRole('button', { name: 'Copy Link' });
    expect(copy.className).toContain('bg-primary');
    expect(copy.className).not.toContain('text-white');
    expect(copy.className).not.toContain('bg-secondary');
  });

  it('shows success toast on clipboard copy', async () => {
    render(<ModalQr value='https://test.url' open onOpenChange={noop} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Copy Link'));
    expect(toast.success).toHaveBeenCalledWith('Link copied to clipboard');
  });

  it('closes drawer even when value is empty', async () => {
    const onOpenChange = vi.fn();
    render(<ModalQr value='' open onOpenChange={onOpenChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Copy Link'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
