'use client';

import type { OverviewStatus } from '@/app/study/study-overview';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import type { StudyProgress } from '@/utils/fhir/research';
import type { WaitingResponse } from '@/utils/fhir/research-schedule';
import type { StudyStatus } from '@/utils/fhir/research-status';
import FindingsSection from './home/findings-section';
import GivenPanel from './home/given-panel';
import GuestSaveBanner from './home/guest-save-banner';
import HomeIntro, { HomeSectionHeading } from './home/home-intro';
import JoinedStudyCard from './home/joined-study-card';
import OpenToJoin from './home/open-to-join';
import TrustStrip from './home/trust-strip';
import UpNextSection from './home/up-next-section';
import { useParticipantHome } from './home/use-participant-home';
import ResearchSkeleton from './research-skeleton';
import ResearcherContent from './researcher-content';

export interface ResearchContentProps {
  isResearcher: boolean;
  researcherLoading: boolean;
  researcherStudies: ResearchStudyWithBatches[];
  isLoading: boolean;
  activeStudyId: string;
  practitionerId?: string;
  waiting?: readonly WaitingResponse[];
  consentedStudyIds?: ReadonlySet<string>;
  onStart: (study: StudyProgress, questionnaireId: string) => void;
  onSlideChange: (studyId: string) => void;
  onResearcherStudyClick: (studyId: string) => void;
}

/**
 * Maps a catalogue study status to the joined card's overview status.
 *
 * @param status - Status computed by the participant home hook.
 * @returns The matching overview status, or undefined to derive it in the card.
 */
function overviewStatusOf(
  status: StudyStatus | undefined
): OverviewStatus | undefined {
  if (status === 'needs-you') return 'needs_you';
  if (status === 'shared-this-batch') return 'shared';
  if (status === 'open' || status === 'closed') return status;
  return undefined;
}

/** Grid of the studies the participant has joined, in joined order. */
function JoinedStudies({ home }: Readonly<{ home: HomeReturn }>) {
  if (home.joinedIds.length === 0) return null;
  return (
    <section data-testid='your-studies' className='flex flex-col gap-3'>
      <HomeSectionHeading kind='your-studies' count={home.joinedIds.length} />
      <ul className='grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6'>
        {home.scopedStudies.map(progress => (
          <li key={progress.study.id}>
            <JoinedStudyCard
              progress={progress}
              today={home.today}
              status={overviewStatusOf(
                home.statuses.get(progress.study.id ?? '')?.status
              )}
              konsulinOrganizationId={home.konsulinOrganizationId}
              isLoading={home.isLoading}
              isError={home.isError}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

type HomeReturn = ReturnType<typeof useParticipantHome>;

/** Participant home: intro, up-next and given panel, joined studies and rest. */
function ParticipantHome({
  onStart
}: Readonly<Pick<ResearchContentProps, 'onStart'>>) {
  const home = useParticipantHome();
  const upNextStudy = home.queue[0]?.leadStudy.study ?? null;

  return (
    <div data-testid='participant-home' className='flex flex-col gap-6'>
      <HomeIntro />
      <GuestSaveBanner
        authored={home.guestBanner?.authored}
        studyId={home.guestBanner?.studyId}
        isPatient={!home.isGuest}
      />
      <section data-testid='up-next-block' className='flex flex-col gap-3'>
        <HomeSectionHeading kind='up-next' />
        <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start'>
          <UpNextSection
            items={home.queue}
            titleMap={home.titleMap}
            joinedCount={home.joinedIds.length}
            onStart={onStart}
            isLoading={home.isLoading}
            isError={home.isError}
          />
          <GivenPanel
            totals={home.totals}
            upNextStudy={upNextStudy}
            isGuest={home.isGuest}
            isLoading={home.isLoading}
            isError={home.isError}
          />
        </div>
      </section>
      <JoinedStudies home={home} />
      <section data-testid='open-to-join-block' className='flex flex-col gap-3'>
        <HomeSectionHeading kind='open-to-join' />
        <OpenToJoin
          studies={home.catalogue}
          joinedIds={home.joinedIds}
          konsulinOrganizationId={home.konsulinOrganizationId}
          titleMap={home.titleMap}
          isLoading={home.isLoading}
          isError={home.isError}
        />
      </section>
      <section data-testid='learning-block' className='flex flex-col gap-3'>
        <HomeSectionHeading kind='learning' />
        <FindingsSection
          items={home.findings}
          isLoading={home.isLoading}
          isError={home.isError}
        />
      </section>
      <TrustStrip />
    </div>
  );
}

/**
 * Renders the research hub: the researcher carousel for researchers and the
 * participant home for patients and guests.
 *
 * @param props - Role, loading flags, researcher studies and handlers.
 * @returns The content element for the current role and data state.
 */
export default function ResearchContent({
  isResearcher,
  researcherLoading,
  researcherStudies,
  isLoading,
  activeStudyId,
  practitionerId,
  onStart,
  onSlideChange,
  onResearcherStudyClick
}: Readonly<ResearchContentProps>) {
  if (isResearcher) {
    return (
      <ResearcherContent
        isLoading={researcherLoading}
        studies={researcherStudies}
        activeId={activeStudyId}
        onSlideChange={onSlideChange}
        onStudyClick={onResearcherStudyClick}
        practitionerId={practitionerId}
        activeStudyId={activeStudyId}
      />
    );
  }

  if (isLoading) return <ResearchSkeleton />;

  return <ParticipantHome onStart={onStart} />;
}
