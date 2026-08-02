'use client';

import { RESEARCH_LEVELS } from '@/constants/research';
import type { ResearchProgress } from '@/utils/fhir/research';
import { Lock, Unlock } from 'lucide-react';

/** Circular progress ring showing a fraction of completion. */
function ProgressRing({ fraction }: Readonly<{ fraction: number }>) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));
  const offset = circumference * (1 - clamped);

  return (
    <svg width='72' height='72' viewBox='0 0 72 72' className='shrink-0'>
      <circle
        cx='36'
        cy='36'
        r={radius}
        fill='none'
        stroke='#E5E7EB'
        strokeWidth='7'
      />
      <circle
        cx='36'
        cy='36'
        r={radius}
        fill='none'
        stroke='#13c2c2'
        strokeWidth='7'
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap='round'
        transform='rotate(-90 36 36)'
      />
      <text
        x='36'
        y='40'
        textAnchor='middle'
        fontSize='11'
        fontWeight='bold'
        fill='#2c2f35'
      >
        {Math.round(clamped * 100)}%
      </text>
    </svg>
  );
}

/** Level card: current level, next level, and progress toward it. */
function LevelCard({ progress }: Readonly<{ progress: ResearchProgress }>) {
  const { currentLevel, nextLevel, levelProgress } = progress;
  const total = levelProgress.intoNext + levelProgress.toNext;
  const widthPercent = total === 0 ? 0 : (levelProgress.intoNext / total) * 100;

  return (
    <div className='mt-4 border-t border-gray-200 pt-3'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-bold text-gray-700'>
          {currentLevel ? `Level ${currentLevel.label}` : 'Not started yet'}
        </span>
        {nextLevel && (
          <span className='text-[10px] text-gray-500'>
            {levelProgress.intoNext}/{total} to {nextLevel.label}
          </span>
        )}
      </div>
      {nextLevel && (
        <div className='mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200'>
          <div
            className='h-full rounded-full bg-[#13c2c2]'
            style={{ width: `${widthPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** Rewards vault: intrinsic rewards, locked until their threshold is met. */
function RewardsVault({ progress }: Readonly<{ progress: ResearchProgress }>) {
  return (
    <div className='mt-4 border-t border-gray-200 pt-3'>
      <h3 className='text-xs font-bold text-gray-700'>Rewards vault</h3>
      <ul className='mt-2 flex flex-col gap-2'>
        {RESEARCH_LEVELS.map(level => {
          const unlocked = progress.cumulativeResponses >= level.threshold;
          return (
            <li
              key={level.threshold}
              className='flex items-center gap-2 text-[11px]'
            >
              {unlocked ? (
                <Unlock className='h-3.5 w-3.5 shrink-0 text-[#13c2c2]' />
              ) : (
                <Lock className='h-3.5 w-3.5 shrink-0 text-gray-400' />
              )}
              <span
                className={unlocked ? 'font-bold text-black' : 'text-gray-400'}
              >
                {level.label}
              </span>
              <span className='text-gray-500'>— {level.reward}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Contribution dashboard: current-batch ring, level progress, rewards vault. */
export default function ContributionDashboard({
  progress
}: Readonly<{ progress: ResearchProgress }>) {
  const primary = progress.studies[0];
  const fraction =
    primary && primary.totalCount > 0
      ? primary.completedCount / primary.totalCount
      : 0;

  return (
    <section className='card mt-4 border-0 bg-[#F9F9F9] p-4'>
      <h2 className='text-sm font-bold text-gray-700'>Your contribution</h2>
      <div className='mt-3 flex items-center gap-4'>
        <ProgressRing fraction={fraction} />
        <div className='flex flex-col gap-1 text-xs text-gray-600'>
          <span>Current batch</span>
          <span className='text-sm font-bold text-black'>
            {primary
              ? `${primary.completedCount}/${primary.totalCount} questionnaires`
              : 'No active batch'}
          </span>
        </div>
      </div>
      <LevelCard progress={progress} />
      <RewardsVault progress={progress} />
    </section>
  );
}
