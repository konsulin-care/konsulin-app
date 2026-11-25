import { wrapper } from '@/__tests__/react-test-utils';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearchContent from '../research-content';
import { makeProgress } from './research-fixtures';

// Mock ResearcherContent
vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

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
  default: ({
    waiting,
    consentedStudyIds
  }: {
    waiting?: readonly { questionnaire?: string }[];
    consentedStudyIds?: ReadonlySet<string>;
  }) => (
    <div
      data-testid='research-carousel'
      data-waiting={waiting?.map(w => w.questionnaire).join(',')}
      data-consented={[...(consentedStudyIds ?? [])].join(',')}
    />
  )
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
        isResearcher
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
        isResearcher
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

  it('renders section 01 before the carousel and section 02 before the dashboard', () => {
    const progress = makeProgress();
    render(
      <ResearchContent
        isResearcher={false}
        researcherLoading={false}
        researcherStudies={[]}
        isLoading={false}
        progress={progress}
        studies={progress.studies}
        activeStudyId='research'
        activeStudy={progress.studies[0]}
        titleMap={new Map()}
        titlesPending={false}
        fhirId='patient-1'
        onSlideChange={vi.fn()}
        onResearcherStudyClick={vi.fn()}
        onStudyClick={vi.fn()}
        onQuestionnaireClick={vi.fn()}
      />,
      { wrapper }
    );
    const studyHeader = screen.getByTestId('section-header-1');
    const contributionHeader = screen.getByTestId('section-header-2');
    const carousel = screen.getByTestId('research-carousel');
    const dashboard = screen.getByTestId('contribution-dashboard');
    expect(studyHeader).toHaveTextContent('01');
    expect(studyHeader).toHaveTextContent('Study');
    expect(contributionHeader).toHaveTextContent('02');
    expect(contributionHeader).toHaveTextContent('Your contribution');
    expect(
      studyHeader.compareDocumentPosition(carousel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      contributionHeader.compareDocumentPosition(dashboard) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('lays out study and contribution as lg grid columns with a sticky contribution column', () => {
    const progress = makeProgress();
    render(
      <ResearchContent
        isResearcher={false}
        researcherLoading={false}
        researcherStudies={[]}
        isLoading={false}
        progress={progress}
        studies={progress.studies}
        activeStudyId='research'
        activeStudy={progress.studies[0]}
        titleMap={new Map()}
        titlesPending={false}
        fhirId='patient-1'
        onSlideChange={vi.fn()}
        onResearcherStudyClick={vi.fn()}
        onStudyClick={vi.fn()}
        onQuestionnaireClick={vi.fn()}
      />,
      { wrapper }
    );
    const leftColumn = screen.getByTestId('section-header-1').parentElement;
    const grid = leftColumn?.parentElement;
    const rightColumn = screen.getByTestId('section-header-2').parentElement;
    expect(grid).toHaveClass(
      'lg:grid',
      'lg:grid-cols-[minmax(0,1fr)_360px]',
      'lg:gap-6',
      'lg:items-start'
    );
    expect(rightColumn).toHaveClass('lg:sticky', 'lg:top-4');
    expect(leftColumn).toContainElement(
      screen.getByTestId('research-carousel')
    );
    expect(rightColumn).toContainElement(
      screen.getByTestId('contribution-dashboard')
    );
  });

  it('forwards waiting and consentedStudyIds to ResearchCarousel unchanged', () => {
    const progress = makeProgress();
    const waiting = [
      { questionnaire: 'questionnaire-1' },
      { questionnaire: 'questionnaire-2' }
    ];
    const consentedStudyIds = new Set(['study-a', 'study-b']);
    render(
      <ResearchContent
        isResearcher={false}
        researcherLoading={false}
        researcherStudies={[]}
        isLoading={false}
        progress={progress}
        studies={progress.studies}
        activeStudyId='research'
        activeStudy={progress.studies[0]}
        titleMap={new Map()}
        titlesPending={false}
        fhirId='patient-1'
        waiting={waiting}
        consentedStudyIds={consentedStudyIds}
        onSlideChange={vi.fn()}
        onResearcherStudyClick={vi.fn()}
        onStudyClick={vi.fn()}
        onQuestionnaireClick={vi.fn()}
      />,
      { wrapper }
    );
    const carousel = screen.getByTestId('research-carousel');
    expect(carousel).toHaveAttribute(
      'data-waiting',
      'questionnaire-1,questionnaire-2'
    );
    expect(carousel).toHaveAttribute('data-consented', 'study-a,study-b');
  });
});
