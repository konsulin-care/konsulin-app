import { getStatus, subscribe } from '@/lib/connectivity';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConnectivityIndicator from '../connectivity-indicator';

vi.mock('@/lib/connectivity', () => ({
  getStatus: vi.fn(),
  initConnectivity: vi.fn(),
  subscribe: vi.fn(() => vi.fn())
}));

describe('ConnectivityIndicator', () => {
  beforeEach(() => {
    vi.mocked(getStatus).mockReturnValue('stable');
    vi.mocked(subscribe).mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when the connection is stable', () => {
    render(<ConnectivityIndicator />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a subtle retrying bar when the connection is unstable', () => {
    vi.mocked(getStatus).mockReturnValue('unstable');
    render(<ConnectivityIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent(
      /connection unstable/i
    );
  });

  it('shows an offline message when fully offline', () => {
    vi.mocked(getStatus).mockReturnValue('offline');
    render(<ConnectivityIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
  });

  it('renders the status region as an <output> element', () => {
    vi.mocked(getStatus).mockReturnValue('offline');
    const { container } = render(<ConnectivityIndicator />);
    expect(container.querySelector('output')).not.toBeNull();
  });
});
