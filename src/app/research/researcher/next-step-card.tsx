'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import type {
  ResearcherNextStep,
  ResearcherStudy
} from '@/utils/fhir/researcher-next-step';
import { nextResearcherStep } from '@/utils/fhir/researcher-next-step';
import { formatBatchDate } from '@/utils/format-batch-date';
import { localDateOf } from '@/utils/local-date';
import type { ResearchStudy } from 'fhir/r4';
import type { ReactNode } from 'react';

/** Props of the researcher home next-step card. */
export interface NextStepCardProps {
  /** Researcher studies used to look up the batch context. */
  studies?: readonly ResearcherStudy[];
  /** Reference date, yyyy-mm-dd; defaults to today. */
  today?: string;
  /** Precomputed next step; computed from studies and today when omitted. */
  step?: ResearcherNextStep;
  /** Called with the study and zero-based batch index to post a finding. */
  onPostFinding?: (study: ResearchStudy, batchIndex: number) => void;
  /** Called when the researcher chooses to register a study. */
  onRegisterStudy?: () => void;
}

interface BatchContext {
  index: number;
  title: string;
}

/**
 * Finds the study and one-based batch index for a batch edge date.
 *
 * @param studies - Researcher studies to search.
 * @param date - Batch start or end date, yyyy-mm-dd.
 * @param edge - Which batch date must match.
 * @returns The batch context, or null when no batch matches.
 */
function findBatchContext(
  studies: readonly ResearcherStudy[],
  date: string,
  edge: 'start' | 'end'
): BatchContext | null {
  for (const { study, batches } of studies) {
    const index = batches.findIndex(batch => batch[edge] === date);
    if (index !== -1) {
      return { index: index + 1, title: study.title ?? '' };
    }
  }
  return null;
}

function Card({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <section
      data-testid='next-step-card'
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      {children}
    </section>
  );
}

function RegisterStep({
  onRegisterStudy
}: Readonly<{ onRegisterStudy?: () => void }>) {
  const t = useTranslations('research');
  return (
    <Card>
      <p className='text-charcoal-700 text-sm'>
        {t('next_step_card.register')}
      </p>
      <Button
        type='button'
        variant='action'
        className='self-start'
        onClick={onRegisterStudy}
      >
        {t('next_step_card.register_study')}
      </Button>
    </Card>
  );
}

function ShareStep({
  step,
  onPostFinding
}: Readonly<{
  step: Extract<ResearcherNextStep, { kind: 'share' }>;
  onPostFinding?: (study: ResearchStudy, batchIndex: number) => void;
}>) {
  const t = useTranslations('research');
  const title = step.study.title ?? '';
  return (
    <Card>
      <p className='text-charcoal-700 text-sm'>
        {t('next_step_card.share', {
          index: step.batchIndex + 1,
          title
        })}
      </p>
      <Button
        type='button'
        variant='action'
        className='self-start'
        onClick={() => onPostFinding?.(step.study, step.batchIndex)}
      >
        {t('next_step_card.post_finding')}
      </Button>
    </Card>
  );
}

function OpenStep({
  closesOn,
  studies
}: Readonly<{
  closesOn: string;
  studies: readonly ResearcherStudy[];
}>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const context = findBatchContext(studies, closesOn, 'end');
  return (
    <Card>
      <p className='text-charcoal-700 text-sm'>
        {t('next_step_card.open', {
          index: context?.index ?? 1,
          title: context?.title ?? '',
          date: formatBatchDate(closesOn, locale)
        })}
      </p>
    </Card>
  );
}

function UpcomingStep({
  opensOn,
  studies
}: Readonly<{
  opensOn: string;
  studies: readonly ResearcherStudy[];
}>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const context = findBatchContext(studies, opensOn, 'start');
  return (
    <Card>
      <p className='text-charcoal-700 text-sm'>
        {t('next_step_card.upcoming', {
          index: context?.index ?? 1,
          title: context?.title ?? '',
          date: formatBatchDate(opensOn, locale)
        })}
      </p>
    </Card>
  );
}

function AllClosedStep() {
  const t = useTranslations('research');
  return (
    <Card>
      <p className='text-charcoal-700 text-sm'>
        {t('next_step_card.all_closed')}
      </p>
    </Card>
  );
}

/**
 * Researcher home next-step card: shares a closed batch, shows the open or
 * upcoming closing date, or asks the researcher to register their first study.
 *
 * @param props - Studies, reference date, optional step and action callbacks.
 * @returns The next-step card element.
 */
export default function NextStepCard({
  studies = [],
  today,
  step,
  onPostFinding,
  onRegisterStudy
}: Readonly<NextStepCardProps>) {
  const resolved =
    step ??
    nextResearcherStep(studies, today ?? localDateOf(new Date().toISOString()));

  if (resolved.kind === 'register') {
    return <RegisterStep onRegisterStudy={onRegisterStudy} />;
  }
  if (resolved.kind === 'share') {
    return <ShareStep step={resolved} onPostFinding={onPostFinding} />;
  }
  if (resolved.kind === 'open') {
    return <OpenStep closesOn={resolved.closesOn} studies={studies} />;
  }
  if (resolved.kind === 'upcoming') {
    return <UpcomingStep opensOn={resolved.opensOn} studies={studies} />;
  }
  return <AllClosedStep />;
}
