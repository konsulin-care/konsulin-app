'use client';

import Avatar from '@/components/general/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  RESEARCH_LEVELS,
  buildMission,
  getResearchLevelFraction,
  getResearchLevelNumber,
  type MissionQuestionnaire
} from '@/constants/research';
import { useAuth } from '@/context/auth/authContext';
import { useResearchXp } from '@/hooks/useResearchXp';
import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import type { QuestionnaireInfo } from '@/services/api/research';
import { questionnaireIdLabel } from '@/utils/fhir/questionnaire-url';
import type { ResearchProgress, StudyProgress } from '@/utils/fhir/research';
import { getNextBatch } from '@/utils/fhir/research-schedule';
import { formatBatchDate } from '@/utils/format-batch-date';
import { generateAvatarPlaceholder } from '@/utils/helper';
import { localDateOf } from '@/utils/local-date';
import { Check, Target, Trophy, Users, type LucideIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

/** Avatar data resolved from the current user profile. */
interface AvatarData {
  photoUrl?: string;
  initials: string;
  backgroundColor: string;
  seed: string;
}

/**
 * Halo ring around the profile picture: the ring arc is the fraction of the
 * current level's XP span earned, with a "Lv N" chip pinned to the bottom edge.
 */
function LevelHalo({
  fraction,
  level,
  avatar
}: Readonly<{ fraction: number; level: number; avatar: AvatarData }>) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));

  return (
    <div className='relative h-[72px] w-[72px] shrink-0'>
      <svg width='72' height='72' viewBox='0 0 72 72'>
        <circle
          cx='36'
          cy='36'
          r={radius}
          fill='none'
          stroke='var(--color-border)'
          strokeWidth='8'
        />
        <circle
          cx='36'
          cy='36'
          r={radius}
          fill='none'
          strokeWidth='8'
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap='round'
          transform='rotate(-90 36 36)'
          data-testid='dashboard-halo-ring'
          data-fraction={clamped}
          // Palette-driven arc color; inline style because SVG stroke
          // attributes cannot resolve CSS custom properties.
          style={{ stroke: 'var(--color-gold)' }}
        />
      </svg>
      <div className='absolute inset-[6px] overflow-hidden rounded-full'>
        <Avatar
          photoUrl={avatar.photoUrl}
          initials={avatar.initials}
          backgroundColor={avatar.backgroundColor}
          seed={avatar.seed}
          height={60}
          width={60}
        />
      </div>
      <span
        data-testid='dashboard-level'
        className='bg-secondary absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap text-white'
      >
        Lv {level}
      </span>
    </div>
  );
}

/** Level icon in a teal chip. */
function TitleIcon({ icon: Icon }: Readonly<{ icon: LucideIcon }>) {
  return (
    <span className='bg-secondary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
      <Icon className='text-turquoise-deep h-3.5 w-3.5' />
    </span>
  );
}

/** Non-interactive title badge for guests: icon chip plus the label. */
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

/**
 * Patient title badge whose label opens a popover listing every reached
 * level's reward, oldest first.
 *
 * @param title - The current research title.
 * @param totalXp - Total XP used to resolve the reached levels.
 */
function TitleWithRewards({
  title,
  totalXp
}: Readonly<{
  title: { label: string; icon: LucideIcon };
  totalXp: number;
}>) {
  const reached = RESEARCH_LEVELS.filter(level => level.threshold <= totalXp);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          data-testid='dashboard-title'
          className='flex cursor-pointer items-center gap-2'
        >
          <TitleIcon icon={title.icon} />
          <span className='text-foreground text-sm font-bold'>
            {title.label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side='bottom' align='start' className='w-64'>
        <p className='text-foreground text-xs font-bold'>
          As a {title.label}, you will receive:
        </p>
        <ul className='mt-2 flex flex-col gap-1.5'>
          {reached.map(level => (
            <li
              key={level.threshold}
              data-testid='dashboard-reward-item'
              className='text-muted-foreground flex items-start gap-2 text-xs'
            >
              <Check className='text-turquoise-deep mt-0.5 h-3.5 w-3.5 shrink-0' />
              <span>{level.reward}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
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
  children: ReactNode;
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
 * Personal contribution dashboard for the research hub.
 *
 * Left: profile picture wrapped in a halo ring showing XP progress toward the
 * next level. Right: title badge, people converted through the user's link,
 * and the current batch completion rate. Below: the mission line and the
 * collapsible rewards vault. Guests see a fixed "Participant" title.
 *
 * @param progress - Aggregate research progress (responses + questionnaire XP).
 * @param activeStudy - The currently selected study, for the batch rate.
 * @param questionnaireInfo - Resolved titles and durations per questionnaire.
 */
export default function ContributionDashboard({
  progress,
  activeStudy,
  questionnaireInfo
}: Readonly<{
  progress: ResearchProgress;
  activeStudy: StudyProgress | null;
  questionnaireInfo: ReadonlyMap<string, QuestionnaireInfo>;
}>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const { state: authState } = useAuth();
  const { totalXp, converted, isPatient, title } = useResearchXp(
    progress,
    questionnaireInfo
  );

  const missionQuestionnaires: MissionQuestionnaire[] = useMemo(() => {
    const completed = new Set(activeStudy?.completedQuestionnaireIds);
    const studyCounts = new Map<string, number>();
    for (const study of progress.studies) {
      for (const id of study.currentBatch?.questionnaireIds ?? []) {
        studyCounts.set(id, (studyCounts.get(id) ?? 0) + 1);
      }
    }
    return (activeStudy?.currentBatch?.questionnaireIds ?? [])
      .filter(id => !completed.has(id))
      .map(id => ({
        id,
        title: questionnaireInfo.get(id)?.title ?? questionnaireIdLabel(id),
        durationMinutes: questionnaireInfo.get(id)?.durationMinutes ?? null,
        studyCount: studyCounts.get(id) ?? 1
      }));
  }, [
    activeStudy?.currentBatch,
    activeStudy?.completedQuestionnaireIds,
    progress.studies,
    questionnaireInfo
  ]);
  const today = localDateOf(new Date().toISOString());
  const nextBatchStart =
    getNextBatch(activeStudy?.batches ?? [], today)?.start ?? null;
  const mission = buildMission({
    totalXp,
    questionnaires: missionQuestionnaires,
    isGuest: !isPatient,
    nextBatchStart
  });
  const level = mission.levelKey ? t(mission.levelKey) : '';
  const goal = mission.levelKey
    ? t('mission.goal_level', { level })
    : t('mission.goal_level_up');
  const date = mission.date ? formatBatchDate(mission.date, locale) : '';
  const missionText = t(mission.key, {
    ...mission.params,
    goal,
    level,
    date
  });

  const avatar: AvatarData = useMemo(() => {
    const placeholder = generateAvatarPlaceholder({
      name: authState?.userInfo?.fullname,
      email: authState?.userInfo?.email,
      userId: authState?.userInfo?.userId
    });
    return {
      photoUrl: authState?.userInfo?.profile_picture,
      initials: placeholder.initials ?? 'GU',
      backgroundColor:
        placeholder.backgroundColor ?? 'var(--color-turquoise-deep)',
      seed: placeholder.seed ?? 'guest'
    };
  }, [authState?.userInfo]);

  const batchCount = activeStudy
    ? `${activeStudy.completedCount}/${activeStudy.totalCount} questionnaires`
    : 'No active batch';

  return (
    <section
      data-testid='contribution-dashboard'
      className='card bg-muted mt-4 border-0 p-4'
    >
      <div className='flex items-center gap-4'>
        <LevelHalo
          fraction={getResearchLevelFraction(totalXp)}
          level={getResearchLevelNumber(totalXp)}
          avatar={avatar}
        />
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          {isPatient ? (
            <TitleWithRewards title={title} totalXp={totalXp} />
          ) : (
            <TitleBadge title={title} />
          )}
          <StatRow icon={Users} testId='dashboard-converted'>
            {isPatient
              ? `${converted} joined via your link`
              : 'Invite friends to start'}
          </StatRow>
          <StatRow icon={Trophy} testId='dashboard-batch-count'>
            {batchCount}
          </StatRow>
        </div>
      </div>
      <Mission text={missionText} />
    </section>
  );
}
