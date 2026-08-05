'use client';

import { RESEARCH_LEVELS, getResearchLevelNumber } from '@/constants/research';
import { ChevronDown, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';

/**
 * Collapsible rewards vault.
 *
 * Collapsed, it shows only the reward unlocked at the user's current level.
 * Expanded, it reveals the next reward (with the XP still required) plus the
 * full level ladder with lock/unlock states and XP thresholds.
 *
 * @param totalXp - Total experience points used to resolve the current level.
 */
export default function RewardsVault({
  totalXp
}: Readonly<{ totalXp: number }>) {
  const [expanded, setExpanded] = useState(false);
  const levelIndex = Math.min(
    getResearchLevelNumber(totalXp) - 1,
    RESEARCH_LEVELS.length - 1
  );
  const current = RESEARCH_LEVELS[levelIndex];
  const next =
    levelIndex + 1 < RESEARCH_LEVELS.length
      ? RESEARCH_LEVELS[levelIndex + 1]
      : null;

  return (
    <div className='mt-3 border-t border-gray-200 pt-3'>
      <button
        type='button'
        data-testid='dashboard-vault-toggle'
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        className='flex w-full cursor-pointer items-center justify-between text-xs font-bold text-gray-700'
      >
        <span>Rewards vault</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        data-testid='dashboard-vault-current'
        className='mt-2 flex items-center gap-2 text-[11px]'
      >
        <Unlock className='h-3.5 w-3.5 shrink-0 text-[#13c2c2]' />
        <span className='font-bold text-black'>{current.label}</span>
        <span className='text-gray-500'>— {current.reward}</span>
      </div>
      {expanded && (
        <div className='mt-2 flex flex-col gap-2'>
          {next && (
            <div
              data-testid='dashboard-vault-next'
              className='flex items-center gap-2 text-[11px]'
            >
              <Lock className='h-3.5 w-3.5 shrink-0 text-gray-400' />
              <span className='font-bold text-gray-700'>{next.label}</span>
              <span className='text-gray-500'>— {next.reward}</span>
              <span className='text-[10px] text-gray-400'>
                ({Math.max(0, next.threshold - totalXp)} XP to unlock)
              </span>
            </div>
          )}
          <ul className='mt-1 flex flex-col gap-1.5'>
            {RESEARCH_LEVELS.map(level => {
              const unlocked = totalXp >= level.threshold;
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
                    className={
                      unlocked ? 'font-bold text-black' : 'text-gray-400'
                    }
                  >
                    {level.label}
                  </span>
                  <span className='text-gray-500'>{level.threshold} XP</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
