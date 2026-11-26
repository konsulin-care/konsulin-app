'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/i18n';
import { useStudyParticipantCount } from '@/services/api/research-counts';
import {
  StudyConflictError,
  usePostFinding
} from '@/services/api/research-findings';
import type { ResearchStudy } from 'fhir/r4';
import { useEffect, useRef, useState } from 'react';

/** Props of the researcher finding composer. */
export interface FindingComposerProps {
  /** Study the finding belongs to. */
  study: ResearchStudy;
}

/**
 * Keeps the participant count field in sync with the loaded count until the
 * researcher types their own value.
 *
 * @param participantCount - Current participant count, or undefined while loading.
 * @returns The count value and its setter, as strings for the input.
 */
function useParticipantCountField(participantCount: number | undefined) {
  const [value, setValue] = useState('');
  const touched = useRef(false);
  useEffect(() => {
    if (touched.current || participantCount === undefined) return;
    setValue(String(participantCount));
  }, [participantCount]);
  return {
    value,
    onChange: (next: string) => {
      touched.current = true;
      setValue(next);
    }
  };
}

/**
 * Shows the confirmation or conflict feedback after a submit attempt.
 *
 * @param props - Whether the post succeeded and whether it conflicted.
 * @returns The status paragraph, or null when there is nothing to report.
 */
function PostFeedback({
  posted,
  conflict
}: Readonly<{ posted: boolean; conflict: boolean }>) {
  const t = useTranslations('research');
  if (posted) {
    return (
      <p role='status' className='text-charcoal-700 text-sm'>
        {t('finding_composer.posted')}
      </p>
    );
  }
  if (conflict) {
    return (
      <p role='alert' className='text-destructive text-sm'>
        {t('finding_composer.conflict')}
      </p>
    );
  }
  return null;
}

/**
 * Researcher finding composer: intro, finding text, participant count prefilled
 * from the current count, and a submit button calling usePostFinding.
 *
 * @param props - The study the finding belongs to.
 * @returns The finding composer element.
 */
export default function FindingComposer({
  study
}: Readonly<FindingComposerProps>) {
  const t = useTranslations('research');
  const { data: participantCount, isLoading } = useStudyParticipantCount(
    study.id
  );
  const countField = useParticipantCountField(participantCount);
  const [text, setText] = useState('');
  const postFinding = usePostFinding();
  const conflict = postFinding.error instanceof StudyConflictError;

  const handleSubmit = () => {
    const parsedCount = Number.parseInt(countField.value, 10);
    postFinding.mutate({
      studyId: study.id ?? '',
      text,
      time: new Date().toISOString(),
      authorReference: study.principalInvestigator?.reference ?? '',
      authorDisplay: study.principalInvestigator?.display,
      participantCount: Number.isNaN(parsedCount) ? undefined : parsedCount
    });
  };

  return (
    <section
      data-testid='finding-composer'
      className='border-border bg-card flex flex-col gap-4 rounded-lg border p-4'
    >
      <p className='text-charcoal-700 text-sm'>
        {t('finding_composer.intro', { title: study.title ?? '' })}
      </p>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='finding-text'>{t('finding_composer.text_label')}</Label>
        <Textarea
          id='finding-text'
          value={text}
          onChange={event => setText(event.target.value)}
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='finding-count'>
          {t('finding_composer.count_label')}
        </Label>
        {isLoading ? (
          <Skeleton className='h-11 w-full' />
        ) : (
          <Input
            id='finding-count'
            type='number'
            min={0}
            value={countField.value}
            onChange={event => countField.onChange(event.target.value)}
          />
        )}
      </div>
      <Button
        type='button'
        variant='action'
        className='min-h-11 self-start rounded-lg'
        disabled={text.trim() === '' || postFinding.isPending}
        onClick={handleSubmit}
      >
        {t('finding_composer.submit')}
      </Button>
      <PostFeedback posted={postFinding.isSuccess} conflict={conflict} />
    </section>
  );
}
