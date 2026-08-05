import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CirclePanel from '../circle-panel';

const { mockUseCircleStats } = vi.hoisted(() => ({
  mockUseCircleStats: vi.fn()
}));

vi.mock('@/services/api/circle', () => ({
  useCircleStats: mockUseCircleStats
}));

describe('CirclePanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the converted count and milestone for patients', () => {
    mockUseCircleStats.mockReturnValue({
      data: { converted: 4, joined: 4 }
    });

    render(<CirclePanel isPatient fhirId='PAT-1' />);

    expect(screen.getByTestId('circle-count').textContent).toContain('4');
    expect(screen.getByTestId('circle-milestone').textContent).toContain(
      'community-researcher'
    );
    expect(mockUseCircleStats).toHaveBeenCalledWith('PAT-1');
  });

  it('shows the top milestone when reached', () => {
    mockUseCircleStats.mockReturnValue({
      data: { converted: 7, joined: 7 }
    });

    render(<CirclePanel isPatient fhirId='PAT-1' />);

    expect(screen.getByTestId('circle-count').textContent).toContain('7');
    expect(screen.getByTestId('circle-milestone').textContent).toContain(
      'captain'
    );
  });

  it('shows upsell copy for guests without any credit', () => {
    render(<CirclePanel isPatient={false} />);

    expect(screen.getByTestId('circle-upsell')).toBeInTheDocument();
    expect(screen.queryByTestId('circle-panel')).not.toBeInTheDocument();
    expect(mockUseCircleStats).toHaveBeenCalledWith(undefined);
  });

  it('shows the share count and badge for patients', () => {
    window.localStorage.setItem('konsulin_share_booster', '3');
    mockUseCircleStats.mockReturnValue({
      data: { converted: 4, joined: 4 }
    });

    render(<CirclePanel isPatient fhirId='PAT-1' />);

    expect(screen.getByTestId('share-booster').textContent).toContain('3');
    expect(screen.getByTestId('share-badge').textContent).toContain(
      'community-researcher'
    );
  });

  it('shows the share count and badge for guests', () => {
    window.localStorage.setItem('konsulin_share_booster', '1');

    render(<CirclePanel isPatient={false} />);

    expect(screen.getByTestId('share-booster').textContent).toContain('1');
    expect(screen.getByTestId('share-badge').textContent).toContain('buddy');
  });

  it('hides the share booster before the first share', () => {
    render(<CirclePanel isPatient={false} />);

    expect(screen.queryByTestId('share-booster')).not.toBeInTheDocument();
    expect(screen.queryByTestId('share-badge')).not.toBeInTheDocument();
  });
});
