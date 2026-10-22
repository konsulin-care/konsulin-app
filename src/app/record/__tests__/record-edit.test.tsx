import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/page-header', () => ({
  default: (props: { pageIndicator?: string; backRoute?: string }) => (
    <div
      data-testid='mock-page-header'
      data-indicator={props.pageIndicator ?? ''}
      data-back-route={props.backRoute ?? ''}
    >
      Header
    </div>
  )
}));

vi.mock('@/components/journal/edit', () => ({
  default: () => <div data-testid='mock-edit-journal'>EditJournal</div>
}));

vi.mock('@/app/not-found', () => ({
  default: () => <div data-testid='mock-notfound'>Not Found</div>
}));

import RecordEdit from '../record-edit';

describe('RecordEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders edit journal for Observation resource type', () => {
    render(<RecordEdit resourceType='Observation' resourceId='obs-123' />);
    expect(screen.getByTestId('mock-edit-journal')).toBeInTheDocument();
  });

  it('renders Notfound for unknown resource type', () => {
    render(<RecordEdit resourceType='Condition' resourceId='cond-1' />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('renders Notfound when resourceId is empty', () => {
    render(<RecordEdit resourceType='Observation' resourceId='' />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('renders Notfound when resourceType is empty', () => {
    render(<RecordEdit resourceType='' resourceId='obs-123' />);
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('passes backRoute to PageHeader pointing to view page', () => {
    render(<RecordEdit resourceType='Observation' resourceId='obs-123' />);
    const header = screen.getByTestId('mock-page-header');
    expect(header.dataset.backRoute).toBe('/record?view=Observation/obs-123');
  });

  it('passes pageIndicator "Journaling" for Observation', () => {
    render(<RecordEdit resourceType='Observation' resourceId='obs-123' />);
    const header = screen.getByTestId('mock-page-header');
    expect(header.dataset.indicator).toBe('Journaling');
  });
});
