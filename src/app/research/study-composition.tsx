'use client';

import type { StudyProgress } from '@/utils/fhir/research';
import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

/** Maps a questionnaire id to a readable display name. */
function displayName(id: string): string {
  return id
    .split('-')
    .map(part => part.toUpperCase())
    .join(' ');
}

/** Maps each questionnaire to every study title that deploys it. */
function buildOverlapMap(studies: StudyProgress[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const study of studies) {
    for (const id of study.currentBatch?.questionnaireIds ?? []) {
      const titles = map.get(id) ?? [];
      titles.push(study.study.title ?? study.study.id);
      map.set(id, titles);
    }
  }
  return map;
}

/** Questionnaire list for a single study with done states and overlap hints. */
function StudySection({
  progress,
  overlapMap
}: Readonly<{
  progress: StudyProgress;
  overlapMap: Map<string, string[]>;
}>) {
  const batch = progress.currentBatch;
  if (!batch) return null;

  const completed = new Set(progress.completedQuestionnaireIds);
  const studyTitle = progress.study.title ?? progress.study.id;

  return (
    <section className='card border-0 bg-white p-4'>
      <h3 className='text-sm font-bold text-black'>{studyTitle}</h3>
      <ul className='mt-2 flex flex-col gap-2'>
        {batch.questionnaireIds.map(id => {
          const done = completed.has(id);
          const otherStudies = (overlapMap.get(id) ?? []).filter(
            title => title !== studyTitle
          );
          return (
            <li key={id} className='flex items-start gap-2 text-xs'>
              {done ? (
                <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-[#13c2c2]' />
              ) : (
                <Circle className='mt-0.5 h-4 w-4 shrink-0 text-gray-300' />
              )}
              <div className='flex flex-col'>
                <Link
                  href={`/assessments?id=${id}`}
                  className='font-bold text-gray-800 hover:underline'
                >
                  {displayName(id)}
                </Link>
                {otherStudies.length > 0 && (
                  <span className='text-[10px] text-gray-500'>
                    Also counts toward {otherStudies.join(', ')}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Study composition: per-study questionnaire lists with overlap hints. */
export default function StudyComposition({
  studies
}: Readonly<{ studies: StudyProgress[] }>) {
  const overlapMap = buildOverlapMap(studies);

  return (
    <section className='mt-4'>
      <h2 className='mb-2 text-sm font-bold text-gray-700'>
        Study questionnaires
      </h2>
      <div className='flex flex-col gap-3'>
        {studies.map(progress => (
          <StudySection
            key={progress.study.id}
            progress={progress}
            overlapMap={overlapMap}
          />
        ))}
      </div>
    </section>
  );
}
