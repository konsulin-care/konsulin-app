import { wrapper } from '@/__tests__/react-test-utils';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherContent from '../researcher-content';
import { makeStudyWithBatches } from './research-fixtures';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('../researcher-carousel', () => ({
  default: ({ studies }: { studies: { study: { id: string } }[] }) => (
    <div data-testid='researcher-carousel'>
      {studies.map(s => (
        <div key={s.study.id} data-testid={`mock-slide-${s.study.id}`} />
      ))}
    </div>
  )
}));

vi.mock('../researcher-impact-dashboard', () => ({
  default: () => <div data-testid='researcher-impact-dashboard' />
}));

vi.mock('@/components/general/empty-state', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid='empty-state'>{title}</div>
  )
}));

vi.mock('./research-skeleton', () => ({
  default: () => <div data-testid='research-skeleton' />
}));

describe('ResearcherContent wiring', () => {
  it('renders the carousel and no impact dashboard when studies exist', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[makeStudyWithBatches('study-1')]}
        activeId='study-1'
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
      />,
      { wrapper }
    );
    expect(screen.getByTestId('researcher-carousel')).toBeInTheDocument();
    expect(
      screen.queryByTestId('researcher-impact-dashboard')
    ).not.toBeInTheDocument();
  });

  it('shows the skeleton when loading', () => {
    render(
      <ResearcherContent
        isLoading
        studies={[]}
        activeId=''
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
      />,
      { wrapper }
    );
    expect(screen.getByTestId('research-skeleton')).toBeInTheDocument();
  });

  it('shows the empty state when no studies', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[]}
        activeId=''
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
      />,
      { wrapper }
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
