import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const translations: Record<string, string> = {
  'common.no_results': 'No results',
  'common.try_different': 'Try a different search or filter.'
};

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(
    (namespace: string) => (key: string) =>
      translations[`${namespace}.${key}`] ?? key
  )
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line jsx-a11y/alt-text -- test mock
    <img {...props} />
  )
}));

import EmptyState from '../empty-state';

describe('EmptyState', () => {
  it('renders default title and subtitle', () => {
    render(<EmptyState />);
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(
      screen.getByText('Try a different search or filter.')
    ).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(<EmptyState title='Custom Title' />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('renders custom subtitle when provided', () => {
    render(<EmptyState subtitle='Custom subtitle' />);
    expect(screen.getByText('Custom subtitle')).toBeInTheDocument();
  });

  it('calls useTranslations with common namespace', async () => {
    const { useTranslations } = await import('@/i18n');
    render(<EmptyState />);
    expect(useTranslations).toHaveBeenCalledWith('common');
  });
});
