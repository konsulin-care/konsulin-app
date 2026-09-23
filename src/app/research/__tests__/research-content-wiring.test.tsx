import { wrapper } from '@/__tests__/react-test-utils';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearchContent from '../research-content';

// Mock ResearcherContent
vi.mock('../researcher-content', () => ({
  default: ({
    practitionerId,
    activeStudyId
  }: {
    practitionerId?: string;
    activeStudyId: string;
  }) => (
    <div
      data-testid='researcher-content'
      data-practitioner={practitionerId}
      data-active={activeStudyId}
    />
  )
}));

// Mock other dependencies
vi.mock('../research-carousel', () => ({
  default: () => <div data-testid='research-carousel' />
}));

vi.mock('../contribution-dashboard', () => ({
  default: () => <div data-testid='contribution-dashboard' />
}));

vi.mock('@/components/research/referral-notice', () => ({
  default: () => <div data-testid='referral-notice' />
}));

vi.mock('@/components/general/empty-state', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid='empty-state'>{title}</div>
  )
}));

vi.mock('./research-skeleton', () => ({
  default: () => <div data-testid='research-skeleton' />
}));

describe('ResearchContent wiring', () => {
  it('passes practitionerId and activeStudyId to ResearcherContent', () => {
    render(
      <ResearchContent
        isResearcher={true}
        researcherLoading={false}
        researcherStudies={[]}
        isLoading={false}
        progress={undefined}
        studies={[]}
        activeStudyId='study-1'
        activeStudy={null}
        titleMap={new Map()}
        titlesPending={false}
        practitionerId='practitioner-1'
        onSlideChange={vi.fn()}
        onResearcherStudyClick={vi.fn()}
        onStudyClick={vi.fn()}
        onQuestionnaireClick={vi.fn()}
      />,
      { wrapper }
    );
    const researcherContent = screen.getByTestId('researcher-content');
    expect(researcherContent).toHaveAttribute(
      'data-practitioner',
      'practitioner-1'
    );
    expect(researcherContent).toHaveAttribute('data-active', 'study-1');
  });

  it('passes empty string for activeStudyId when not provided', () => {
    render(
      <ResearchContent
        isResearcher={true}
        researcherLoading={false}
        researcherStudies={[]}
        isLoading={false}
        progress={undefined}
        studies={[]}
        activeStudyId=''
        activeStudy={null}
        titleMap={new Map()}
        titlesPending={false}
        practitionerId='practitioner-1'
        onSlideChange={vi.fn()}
        onResearcherStudyClick={vi.fn()}
        onStudyClick={vi.fn()}
        onQuestionnaireClick={vi.fn()}
      />,
      { wrapper }
    );
    const researcherContent = screen.getByTestId('researcher-content');
    expect(researcherContent).toHaveAttribute('data-active', '');
  });
});
