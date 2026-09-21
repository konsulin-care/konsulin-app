'use client';

import ResearcherLevelHalo from '@/components/research/researcher-level-halo';
import ShareResearchButton from '@/components/research/share-research-button';
import { useResearcherImpact } from '@/hooks/useResearcherImpact';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { useResearcherDashboard } from '@/services/api/researcher';
import {
  CheckCircle2,
  Circle,
  Target,
  Trophy,
  Users,
  type LucideIcon
} from 'lucide-react';

/** Level icon in a teal chip. */
function TitleIcon({ icon: Icon }: Readonly<{ icon: LucideIcon }>) {
  return (
    <span className='bg-secondary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
      <Icon className='text-secondary h-3.5 w-3.5' />
    </span>
  );
}

/** Non-interactive title badge: icon chip plus the label. */
function TitleBadge({
  title
}: Readonly<{ title: { label: string; icon: LucideIcon } }>) {
  return (
    <div className='flex items-center gap-2'>
      <TitleIcon icon={title.icon} />
      <span
        data-testid='dashboard-title'
        className='text-sm font-bold text-black'
      >
        {title.label}
      </span>
    </div>
  );
}

/** One stat row: icon, then the value text. */
function StatRow({
  icon: Icon,
  testId,
  children
}: Readonly<{
  icon: LucideIcon;
  testId: string;
  children: React.ReactNode;
}>) {
  return (
    <div className='flex items-center gap-2 text-xs text-gray-600'>
      <Icon className='h-3.5 w-3.5 shrink-0 text-gray-500' />
      <span data-testid={testId} className='min-w-0'>
        {children}
      </span>
    </div>
  );
}

/** Mission line: the most efficient path to the next level. */
function Mission({ text }: Readonly<{ text: string }>) {
  return (
    <div className='mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2'>
      <Target className='text-secondary h-3.5 w-3.5 shrink-0' />
      <p data-testid='dashboard-mission' className='text-[11px] text-gray-600'>
        {text}
      </p>
    </div>
  );
}

/**
 * Researcher impact dashboard for the research hub.
 *
 * Shows the researcher's impact level, total participants, impact points,
 * mission line, milestones for the focused study, and a share button.
 *
 * @param studies - The researcher's studies from useResearcherDashboard.
 * @param activeStudyId - Currently focused study from the carousel.
 * @param practitionerId - FHIR Practitioner id for share attribution.
 */
export default function ResearcherImpactDashboard({
  studies,
  activeStudyId,
  practitionerId
}: Readonly<{
  studies: ResearchStudyWithBatches[];
  activeStudyId: string;
  practitionerId: string | undefined;
}>) {
  const { data: dashboardData } = useResearcherDashboard(practitionerId);
  const totalParticipants = dashboardData?.totalParticipants ?? 0;

  const { totalImpact, level, levelNumber, impactInLevel, perStudy, mission } =
    useResearcherImpact(studies, activeStudyId, practitionerId);

  const focusedStudy = studies.find(s => s.study.id === activeStudyId);
  const focusedStudyImpact = perStudy.find(s => s.studyId === activeStudyId);
  const focusedStudyParticipants = focusedStudyImpact?.participantCount;

  return (
    <section
      data-testid='researcher-impact-dashboard'
      className='card mt-4 border-0 bg-[#F9F9F9] p-4'
    >
      {/* Row 1: Halo + title + stats */}
      <div className='flex items-center gap-4'>
        <ResearcherLevelHalo
          impactInLevel={impactInLevel}
          levelNumber={levelNumber}
        />
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          <TitleBadge title={level} />
          <StatRow icon={Users} testId='dashboard-participants'>
            {totalParticipants} total participants
          </StatRow>
          <StatRow icon={Trophy} testId='dashboard-impact'>
            {totalImpact} impact points
          </StatRow>
        </div>
      </div>

      {/* Row 2: Mission line */}
      <Mission text={mission} />

      {/* Row 3: Milestones for focused study */}
      {focusedStudy && (
        <div className='mt-3 flex flex-col gap-1'>
          <p className='text-[11px] font-bold text-black'>
            Milestones — {focusedStudy.study.title}
          </p>
          {[10, 50, 100].map(count => {
            const hit = (focusedStudyParticipants ?? 0) >= count;
            return (
              <div key={count} className='flex items-center gap-2 text-[11px]'>
                {hit ? (
                  <CheckCircle2 className='h-3.5 w-3.5 text-[#13c2c2]' />
                ) : (
                  <Circle className='h-3.5 w-3.5 text-gray-300' />
                )}
                <span className={hit ? 'text-black' : 'text-gray-400'}>
                  {count} participants
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Row 4: Share button for focused study */}
      {focusedStudy && (
        <ShareResearchButton
          title={focusedStudy.study.title}
          isPatient={false}
          fhirId={practitionerId}
          studyId={activeStudyId}
          label='Share this study to grow your impact'
          className='mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] text-black'
        />
      )}
    </section>
  );
}
