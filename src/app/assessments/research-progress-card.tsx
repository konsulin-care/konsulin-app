'use client';

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useResearchProgress } from '@/services/api/research';
import { FlaskConical } from 'lucide-react';
import Link from 'next/link';

/**
 * Compact research progress card shown above the assessment search bar.
 *
 * Renders only for patients and guests. Self-hides while loading, when no
 * active study exists, or when the user has no current batch.
 */
export default function ResearchProgressCard() {
  const { state: authState } = useAuth();
  const { data: progress, isLoading } = useResearchProgress();

  const role = authState?.userInfo?.role_name;
  const isPatient = role === Roles.Patient;
  const isGuest = !authState.isAuthenticated;
  if (!isPatient && !isGuest) return null;

  if (isLoading || !progress || progress.studies.length === 0) return null;

  const primary = progress.studies[0];
  const batch = primary.currentBatch;
  if (!batch) return null;

  const batchIndex = primary.batches.indexOf(batch) + 1;
  const levelLabel = progress.currentLevel?.label ?? 'New';
  const percent =
    primary.totalCount === 0
      ? 0
      : (primary.completedCount / primary.totalCount) * 100;

  return (
    <Link
      href='/research'
      data-testid='assessments-research-card'
      className='card mb-4 flex flex-col gap-2 border-0 bg-[#F9F9F9] p-3'
    >
      <div className='flex items-center gap-2'>
        <FlaskConical className='h-5 w-5 shrink-0 text-black' />
        <span className='text-xs text-gray-600'>
          Every questionnaire you complete counts toward the ongoing study
        </span>
        <span className='bg-secondary ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white'>
          {levelLabel}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200'>
          <div
            className='h-full rounded-full bg-[#13c2c2]'
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className='text-[11px] font-bold text-gray-700'>
          Batch {batchIndex} · {primary.completedCount}/{primary.totalCount}
        </span>
        <span className='text-[11px] font-bold text-[#13c2c2]'>Continue →</span>
      </div>
    </Link>
  );
}
