'use client';

import { LevelChip, LevelProgressBar } from '@/components/research/level-chip';
import ShareResearchButton from '@/components/research/share-research-button';
import { buildResearcherMissionCopy } from '@/constants/research';
import { useResearcherImpact } from '@/hooks/useResearcherImpact';
import { useTranslations } from '@/i18n';
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

/** Level icon in a tinted chip. */
function TitleIcon({ icon: Icon }: Readonly<{ icon: LucideIcon }>) {
  return (
    <span className='bg-accent flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
      <Icon className='text-turquoise-deep h-3.5 w-3.5' />
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
        className='text-foreground text-sm font-bold'
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
    <div className='text-muted-foreground flex items-center gap-2 text-xs'>
      <Icon className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
      <span data-testid={testId} className='min-w-0'>
        {children}
      </span>
    </div>
  );
}

/** Mission line: the most efficient path to the next level. */
function Mission({ text }: Readonly<{ text: string }>) {
  return (
    <div className='bg-card mt-3 flex items-center gap-2 rounded-xl px-3 py-2'>
      <Target className='text-turquoise-deep h-3.5 w-3.5 shrink-0' />
      <p
        data-testid='dashboard-mission'
        className='text-muted-foreground text-xs'
      >
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
  const t = useTranslations('research');
  const { data: dashboardData } = useResearcherDashboard(practitionerId);
  const totalParticipants = dashboardData?.totalParticipants ?? 0;

  const { totalImpact, level, levelNumber, levelFraction } =
    useResearcherImpact(
      studies,
      activeStudyId,
      practitionerId,
      totalParticipants
    );

  const mission = buildResearcherMissionCopy({
    impactPoints: totalImpact,
    totalParticipants
  });

  const focusedStudy = studies.find(s => s.study.id === activeStudyId);

  return (
    <section
      data-testid='researcher-impact-dashboard'
      className='card bg-muted mt-4 border-0 p-4'
    >
      {/* Row 1: level chip + title + progress + stats */}
      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div className='flex items-center justify-between gap-2'>
          <TitleBadge title={{ label: t(level.labelKey), icon: level.icon }} />
          <LevelChip label={t('level_chip', { level: levelNumber })} />
        </div>
        <LevelProgressBar
          fraction={levelFraction}
          label={t('contribution.xp_bar_label')}
        />
        <p
          data-testid='dashboard-reward'
          className='text-muted-foreground text-xs'
        >
          {t(level.rewardKey)}
        </p>
        <StatRow icon={Users} testId='dashboard-participants'>
          {t('researcher_dashboard.total_participants', {
            count: totalParticipants
          })}
        </StatRow>
        <StatRow icon={Trophy} testId='dashboard-impact'>
          {t('researcher_dashboard.impact_points', { count: totalImpact })}
        </StatRow>
      </div>

      {/* Row 2: Mission line */}
      <Mission text={t(mission.key, { gap: mission.gap })} />

      {/* Row 3: Milestones based on total participants */}
      <div className='mt-3 flex flex-col gap-1'>
        <p className='text-foreground text-xs font-bold'>
          {t('researcher_dashboard.next_milestones')}
        </p>
        {[10, 50, 100].map(count => {
          const hit = totalParticipants >= count;
          return (
            <div key={count} className='flex items-center gap-2 text-xs'>
              {hit ? (
                <CheckCircle2 className='text-turquoise-deep h-3.5 w-3.5' />
              ) : (
                <Circle className='text-muted-foreground h-3.5 w-3.5' />
              )}
              <span
                className={hit ? 'text-foreground' : 'text-muted-foreground'}
              >
                {t('researcher_dashboard.milestone', { count })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Row 4: Share button for focused study */}
      {focusedStudy && (
        <ShareResearchButton
          title={focusedStudy.study.title}
          isPatient={false}
          fhirId={practitionerId}
          studyId={activeStudyId}
          label={t('share_impact_label')}
          className='border-border text-foreground pointer-events-auto -mx-4 mt-auto flex cursor-pointer items-center justify-center gap-1.5 border-t px-4 pt-2 text-xs'
        />
      )}
    </section>
  );
}
