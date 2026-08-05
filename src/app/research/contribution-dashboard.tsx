'use client';

import Avatar from '@/components/general/avatar';
import {
  GUEST_TITLE,
  LEVEL_XP,
  buildMission,
  getResearchLevel,
  getResearchLevelNumber,
  getXpInLevel,
  type MissionQuestionnaire
} from '@/constants/research';
import { useAuth } from '@/context/auth/authContext';
import { useCircleStats } from '@/services/api/circle';
import type { QuestionnaireInfo } from '@/services/api/research';
import {
  computeQuestionnaireXp,
  type ResearchProgress,
  type StudyProgress
} from '@/utils/fhir/research';
import { generateAvatarPlaceholder } from '@/utils/helper';
import { Target, Trophy, Users, type LucideIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import RewardsVault from './rewards-vault';

/** Avatar data resolved from the current user profile. */
interface AvatarData {
  photoUrl?: string;
  initials: string;
  backgroundColor: string;
  seed: string;
}

/**
 * Halo ring around the profile picture: the ring arc is the XP earned within
 * the current level, with a "Lv N" chip pinned to the bottom edge.
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
          stroke='#E5E7EB'
          strokeWidth='6'
        />
        <circle
          cx='36'
          cy='36'
          r={radius}
          fill='none'
          stroke='#13c2c2'
          strokeWidth='6'
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap='round'
          transform='rotate(-90 36 36)'
          data-testid='dashboard-halo-ring'
          data-fraction={clamped}
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
        className='absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#13c2c2] px-2 py-0.5 text-[10px] font-bold text-white'
      >
        Lv {level}
      </span>
    </div>
  );
}

/** Title badge: level icon in a chip plus the title label. */
function TitleBadge({
  title
}: Readonly<{ title: { label: string; icon: LucideIcon } }>) {
  const Icon = title.icon;
  return (
    <div className='flex items-center gap-2'>
      <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#13c2c2]/10'>
        <Icon className='h-3.5 w-3.5 text-[#13c2c2]' />
      </span>
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
  children: ReactNode;
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
      <Target className='h-3.5 w-3.5 shrink-0 text-[#13c2c2]' />
      <p data-testid='dashboard-mission' className='text-[11px] text-gray-600'>
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
  questionnaireInfo: Readonly<Record<string, QuestionnaireInfo>>;
}>) {
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;
  const isPatient = Boolean(fhirId);
  const { data: circleStats } = useCircleStats(isPatient ? fhirId : undefined);
  const converted = circleStats?.converted ?? 0;

  const durationMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(questionnaireInfo).map(([id, info]) => [
          id,
          info.durationMinutes
        ])
      ),
    [questionnaireInfo]
  );
  const questionnaireXp = useMemo(
    () => computeQuestionnaireXp(progress.questionnaireResponses, durationMap),
    [progress.questionnaireResponses, durationMap]
  );
  const totalXp = questionnaireXp + converted;

  const title: { label: string; icon: LucideIcon } = isPatient
    ? getResearchLevel(totalXp)
    : GUEST_TITLE;

  const missionQuestionnaires: MissionQuestionnaire[] = useMemo(() => {
    const completed = new Set(activeStudy?.completedQuestionnaireIds);
    return (activeStudy?.currentBatch?.questionnaireIds ?? [])
      .filter(id => !completed.has(id))
      .map(id => ({
        id,
        title: questionnaireInfo[id]?.title ?? id,
        durationMinutes: questionnaireInfo[id]?.durationMinutes ?? null
      }));
  }, [
    activeStudy?.currentBatch,
    activeStudy?.completedQuestionnaireIds,
    questionnaireInfo
  ]);
  const mission = buildMission({
    totalXp,
    questionnaires: missionQuestionnaires,
    isGuest: !isPatient
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
      backgroundColor: placeholder.backgroundColor ?? '#13c2c2',
      seed: placeholder.seed ?? 'guest'
    };
  }, [authState?.userInfo]);

  const batchCount = activeStudy
    ? `${activeStudy.completedCount}/${activeStudy.totalCount} questionnaires`
    : 'No active batch';

  return (
    <section
      data-testid='contribution-dashboard'
      className='card mt-4 border-0 bg-[#F9F9F9] p-4'
    >
      <h2 className='text-sm font-bold text-gray-700'>Your contribution</h2>
      <div className='mt-3 flex items-center gap-4'>
        <LevelHalo
          fraction={getXpInLevel(totalXp) / LEVEL_XP}
          level={getResearchLevelNumber(totalXp)}
          avatar={avatar}
        />
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          <TitleBadge title={title} />
          <StatRow icon={Users} testId='dashboard-converted'>
            {isPatient
              ? `${converted} people completed the research through your link`
              : 'Invite friends to start'}
          </StatRow>
          <StatRow icon={Trophy} testId='dashboard-batch-count'>
            {batchCount}
          </StatRow>
        </div>
      </div>
      <Mission text={mission} />
      <RewardsVault totalXp={totalXp} />
    </section>
  );
}
