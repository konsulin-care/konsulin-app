import { wrapper } from '@/__tests__/react-test-utils';
import type { ParticipantHomeData } from '@/app/research/home/use-participant-home';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchContent from '../research-content';
import { makeStudyProgress, TITLE_MAP } from './research-fixtures';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const homeState = vi.hoisted(() => ({ current: {} as unknown }));

vi.mock('../home/use-participant-home', () => ({
  useParticipantHome: () => homeState.current
}));

const STUDY = makeStudyProgress();

/**
 * Builds the participant home data returned by the mocked hook.
 *
 * @param overrides - Home data overrides.
 * @returns The home data fixture.
 */
function makeHome(
  overrides: Partial<ParticipantHomeData> = {}
): ParticipantHomeData {
  const study = makeStudyProgress();
  return {
    scopedStudies: [study],
    joinedIds: [study.study.id ?? ''],
    catalogue: [study],
    shelves: { konsulin: [], others: [], total: 0 },
    queue: [
      {
        questionnaireId: 'phq2',
        studies: [study],
        leadStudy: study,
        closesOn: '2026-08-31'
      }
    ],
    totals: { questionnairesShared: 1, minutes: 8, studies: 1 },
    statuses: new Map([['research', { status: 'needs-you' }]]),
    findings: [],
    guestBanner: null,
    titleMap: TITLE_MAP,
    isLoading: false,
    titlesPending: false,
    isError: false,
    isGuest: false,
    konsulinOrganizationId: '',
    today: '2026-08-15',
    ...overrides
  };
}

/**
 * Renders the participant content with the given home data.
 *
 * @param home - Home data fixture.
 * @param onStart - Start callback.
 * @returns The render result.
 */
function renderParticipant(
  home: ParticipantHomeData,
  onStart = vi.fn()
): ReturnType<typeof render> {
  homeState.current = home;
  return render(
    <ResearchContent
      isResearcher={false}
      researcherLoading={false}
      researcherStudies={[]}
      isLoading={false}
      activeStudyId=''
      onStart={onStart}
      onSlideChange={vi.fn()}
      onResearcherStudyClick={vi.fn()}
    />,
    { wrapper }
  );
}

beforeEach(() => {
  homeState.current = makeHome();
});

describe('ResearchContent participant home', () => {
  it('renders one h1 and the section headings in order', () => {
    renderParticipant(makeHome());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const headers = screen.getAllByTestId(/section-header-/);
    expect(headers.map(header => header.getAttribute('data-testid'))).toEqual([
      'section-header-1',
      'section-header-2',
      'section-header-3',
      'section-header-4'
    ]);
  });

  it('renders Your studies only when the participant has joined a study', () => {
    renderParticipant(makeHome());
    expect(screen.getByTestId('your-studies')).toBeInTheDocument();

    cleanup();
    renderParticipant(
      makeHome({
        scopedStudies: [],
        joinedIds: [],
        queue: [],
        statuses: new Map()
      })
    );

    expect(screen.queryByTestId('your-studies')).toBeNull();
    expect(screen.queryByTestId('section-header-2')).toBeNull();
  });

  it('starts the lead study of the up-next item', () => {
    const onStart = vi.fn();
    renderParticipant(makeHome(), onStart);

    fireEvent.click(screen.getByTestId('up-next-start-phq2'));

    expect(onStart).toHaveBeenCalledWith(STUDY, 'phq2');
  });

  it('renders no carousel element', () => {
    renderParticipant(makeHome());

    expect(screen.queryByTestId('research-carousel')).toBeNull();
    expect(screen.queryAllByTestId(/research-slide-/)).toHaveLength(0);
  });
});

describe('ResearchContent researcher branch', () => {
  it('renders the researcher content instead of the participant home', () => {
    homeState.current = makeHome();
    const study = STUDY;
    render(
      <ResearchContent
        isResearcher
        researcherLoading={false}
        researcherStudies={[]}
        isLoading={false}
        activeStudyId={study.study.id ?? ''}
        practitionerId='practitioner-1'
        onStart={vi.fn()}
        onSlideChange={vi.fn()}
        onResearcherStudyClick={vi.fn()}
      />
    );

    expect(screen.queryByTestId('participant-home')).toBeNull();
  });
});
