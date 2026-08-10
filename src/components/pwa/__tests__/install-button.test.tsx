import { canInstall, installPwa } from '@/lib/pwa-install';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InstallButton from '../install-button';

let mockOnChangeCallback: (() => void) | undefined;

vi.mock('@/lib/pwa-install', () => ({
  canInstall: vi.fn(),
  installPwa: vi.fn(),
  setupInstallPrompt: vi.fn((callback: () => void) => {
    mockOnChangeCallback = callback;
    return vi.fn();
  })
}));

describe('InstallButton', () => {
  beforeEach(() => {
    mockOnChangeCallback = undefined;
    vi.mocked(canInstall).mockReturnValue(false);
  });

  it('renders nothing before the install prompt is available', () => {
    const { container } = render(<InstallButton />);

    expect(container.firstChild).toBeNull();
  });

  it('shows the install button when the prompt becomes available', () => {
    vi.mocked(canInstall).mockReturnValue(true);
    render(<InstallButton />);

    act(() => {
      mockOnChangeCallback?.();
    });

    expect(screen.getByRole('button', { name: /install app/i })).toBeTruthy();
  });

  it('hides the button after the app is installed', () => {
    vi.mocked(canInstall).mockReturnValue(true);
    render(<InstallButton />);
    act(() => {
      mockOnChangeCallback?.();
    });
    expect(screen.getByRole('button', { name: /install app/i })).toBeTruthy();

    vi.mocked(canInstall).mockReturnValue(false);
    act(() => {
      mockOnChangeCallback?.();
    });

    expect(screen.queryByRole('button', { name: /install app/i })).toBeNull();
  });

  it('triggers the install prompt on click', () => {
    vi.mocked(canInstall).mockReturnValue(true);
    render(<InstallButton />);
    act(() => {
      mockOnChangeCallback?.();
    });

    fireEvent.click(screen.getByRole('button', { name: /install app/i }));

    expect(installPwa).toHaveBeenCalled();
  });
});
