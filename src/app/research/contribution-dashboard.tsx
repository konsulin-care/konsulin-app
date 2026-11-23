'use client';

import Avatar from '@/components/general/avatar';
import { LevelChip, LevelProgressBar } from '@/components/research/level-chip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  GUEST_TITLE,
  RESEARCH_LEVELS,
  buildMission,
  getResearchLevel,
  getResearchLevelFraction,
  getResearchLevelNumber,
  getResearchLevelProgress,
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
import type { LucideIcon } from 'lucide-react';
import { Check, Target, Trophy, Users } from 'lucide-react';
import { useMemo } from 'react';

/**
 * Collects the remaining questionnaires of the active batch with their XP basis.
 *
 * @param activeStudy - The selected study, or null when there is no batch.
 * @param studies - Every study progress, used to multiply shared questionnaires.
 * @param questionnaireInfo - Resolved titles and durations per questionnaire.
 * @returns The unfinished batch questionnaires.
 */
function collectMissionQuestionnaires(
  activeStudy: StudyProgress | null,
  studies: readonly StudyProgress[],
  questionnaireInfo: ReadonlyMap<string, QuestionnaireInfo>
): MissionQuestionnaire[] {
  const completed = new Set(activeStudy?.completedQuestionnaireIds);
  const counts = new Map<string, number>();
  for (const study of studies) {
    for (const id of study.currentBatch?.questionnaireIds ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return (activeStudy?.currentBatch?.questionnaireIds ?? [])
    .filter(id => !completed.has(id))
    .map(id => ({
      id,
      title: questionnaireInfo.get(id)?.title ?? questionnaireIdLabel(id),
      durationMinutes: questionnaireInfo.get(id)?.durationMinutes ?? null,
      studyCount: counts.get(id) ?? 1
    }));
}

/** Title icon in a tinted chip plus the resolved title label. */
function TitleLabel({
  label,
  icon: Icon,
  testId
}: Readonly<{ label: string; icon: LucideIcon; testId: string }>) {
  return (
    <span data-testid={testId} className='flex items-center gap-2'>
      <span className='bg-accent flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
        <Icon className='text-turquoise-deep h-3.5 w-3.5' />
      </span>
      <span className='text-foreground text-sm font-bold'>{label}</span>
    </span>
  );
}

/**
 * Title row: the label opens a rewards popover for patients; guests get a
 * plain label. Both carry the level chip.
 *
 * @param isPatient - Whether the viewer is a patient.
 * @param label - The resolved title label.
 * @param icon - The title icon.
 * @param totalXp - Total XP used by the chip and the rewards popover.
 */
function TitleRow({
  isPatient,
  label,
  icon,
  totalXp
}: Readonly<{
  isPatient: boolean;
  label: string;
  icon: LucideIcon;
  totalXp: number;
}>) {
  const t = useTranslations('research');
  const chip = isPatient ? (
    <LevelChip
      label={t('level_chip', { level: getResearchLevelNumber(totalXp) })}
    />
  ) : (
    <LevelChip label={t('level.participant')} variant='guest' />
  );
  const labelNode = (
    <TitleLabel label={label} icon={icon} testId='dashboard-title' />
  );
  if (!isPatient) {
    return (
      <div className='flex items-center justify-between gap-2'>
        {labelNode}
        {chip}
      </div>
    );
  }
  const reached = RESEARCH_LEVELS.filter(level => level.threshold <= totalXp);
  return (
    <div className='flex items-center justify-between gap-2'>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type='button'
            className='flex cursor-pointer items-center gap-2'
          >
            {labelNode}
          </button>
        </PopoverTrigger>
        <PopoverContent side='bottom' align='start' className='w-64'>
          <p className='text-foreground text-xs font-bold'>
            {t('contribution.rewards_title', { level: label })}
          </p>
          <ul className='mt-2 flex flex-col gap-1.5'>
            {reached.map(level => (
              <li
                key={level.threshold}
                data-testid='dashboard-reward-item'
                className='text-muted-foreground flex items-start gap-2 text-xs'
              >
                <Check className='text-turquoise-deep mt-0.5 h-3.5 w-3.5 shrink-0' />
                <span>{t(level.rewardKey)}</span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {chip}
    </div>
  );
}

/**
 * Personal contribution dashboard for the research hub.
 *
 * Left: a plain avatar. Right: the title badge with a level chip, level
 * progress, and the user's contribution stats. Patients see their level,
 * progress toward the next one, people joined through their link, and the
 * current batch rate; guests see a fixed "Participant" chip and an invite.
 * Below: the mission line.
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
  const { totalXp, converted, isPatient } = useResearchXp(
    progress,
    questionnaireInfo
  );

  const missionQuestionnaires = useMemo(
    () =>
      collectMissionQuestionnaires(
        activeStudy,
        progress.studies,
        questionnaireInfo
      ),
    [activeStudy, progress.studies, questionnaireInfo]
  );
  const today = localDateOf(new Date().toISOString());
  const nextBatchStart =
    getNextBatch(activeStudy?.batches ?? [], today)?.start ?? null;
  const mission = buildMission({
    totalXp,
    questionnaires: missionQuestionnaires,
    isGuest: !isPatient,
    nextBatchStart
  });

  const avatar = useMemo(() => {
    const user = authState?.userInfo;
    const placeholder = generateAvatarPlaceholder({
      name: user?.fullname,
      email: user?.email,
      userId: user?.userId
    });
    return {
      photoUrl: user?.profile_picture,
      initials: placeholder.initials ?? 'GU',
      seed: placeholder.seed ?? 'guest'
    };
  }, [authState?.userInfo]);
  const activeTitle = isPatient ? getResearchLevel(totalXp) : GUEST_TITLE;
  const { next, toNext } = getResearchLevelProgress(totalXp);
  const xpText = next
    ? t('contribution.xp_to_next', { xp: toNext, level: t(next.labelKey) })
    : t('contribution.top_level');
  const level = mission.levelKey ? t(mission.levelKey) : '';
  const goal = mission.levelKey
    ? t('mission.goal_level', { level })
    : t('mission.goal_level_up');
  const date = mission.date ? formatBatchDate(mission.date, locale) : '';
  const missionText = t(mission.key, { ...mission.params, goal, level, date });
  const convertedText = isPatient
    ? t('contribution.joined_via_link', { count: converted })
    : t('contribution.invite_to_start');
  const batchText = activeStudy
    ? t('contribution.batch_count', {
        completed: activeStudy.completedCount,
        total: activeStudy.totalCount
      })
    : t('contribution.no_active_batch');

  return (
    <section
      data-testid='contribution-dashboard'
      className='card bg-muted mt-4 border-0 p-4'
    >
      <div className='flex items-center gap-4'>
        <Avatar
          photoUrl={avatar.photoUrl}
          initials={avatar.initials}
          seed={avatar.seed}
          height={48}
          width={48}
        />
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          <TitleRow
            isPatient={isPatient}
            label={t(activeTitle.labelKey)}
            icon={activeTitle.icon}
            totalXp={totalXp}
          />
          {isPatient && (
            <div className='flex flex-col gap-1'>
              <LevelProgressBar
                fraction={getResearchLevelFraction(totalXp)}
                label={t('contribution.xp_bar_label')}
              />
              <p
                data-testid='dashboard-xp'
                className='text-muted-foreground text-xs'
              >
                {xpText}
              </p>
            </div>
          )}
          <div className='text-muted-foreground flex items-center gap-2 text-xs'>
            <Users className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
            <span data-testid='dashboard-converted' className='min-w-0'>
              {convertedText}
            </span>
          </div>
          <div className='text-muted-foreground flex items-center gap-2 text-xs'>
            <Trophy className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
            <span data-testid='dashboard-batch-count' className='min-w-0'>
              {batchText}
            </span>
          </div>
        </div>
      </div>
      <div className='bg-card mt-3 flex items-center gap-2 rounded-xl px-3 py-2'>
        <Target className='text-turquoise-deep h-3.5 w-3.5 shrink-0' />
        <p
          data-testid='dashboard-mission'
          className='text-muted-foreground text-xs'
        >
          {missionText}
        </p>
      </div>
    </section>
  );
}
