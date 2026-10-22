import { render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Mock child components to avoid heavy dependencies
vi.mock('../clinic-list', () => ({
  default: () => <div data-testid='mock-clinic-list'>Clinic List</div>
}));

vi.mock('../clinic-detail', () => ({
  default: () => <div data-testid='mock-clinic-detail'>Clinic Detail</div>
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn()
}));

import { useSearchParams } from 'next/navigation';
import ClinicPage from '../page';

beforeAll(() => {
  globalThis.window.scrollTo = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ClinicPage - scroll to top', () => {
  it('scrolls to top when rendering the clinic list (no clinicId)', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );

    render(<ClinicPage />);

    expect(screen.getByTestId('mock-clinic-list')).toBeDefined();
    expect(globalThis.window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does NOT scroll to top when rendering clinic detail (id present)', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=org-123') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<ClinicPage />);

    expect(screen.getByTestId('mock-clinic-detail')).toBeDefined();
    expect(globalThis.window.scrollTo).not.toHaveBeenCalled();
  });
});
