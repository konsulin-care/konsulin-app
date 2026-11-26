'use client';

import { CollectiveGoal } from '@/app/research/collective-goal';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import type { GivenTotals } from '@/utils/fhir/research-contribution';
import type { ResearchStudy } from 'fhir/r4';

/** Props of the participant home given panel. */
export interface GivenPanelProps {
  /** Totals computed by computeGivenTotals. */
  totals: GivenTotals;
  /** Study featured by the up-next section, when any. */
  upNextStudy: ResearchStudy | null;
  /** True for a participant who has not signed in. */
  isGuest: boolean;
  /** True when the participant consented to the up-next study. */
  isConsented?: boolean;
  /** True while the underlying research data is loading. */
  isLoading?: boolean;
  /** True when the underlying research data failed to load. */
  isError?: boolean;
}

/**
 * Renders one label and value pair of the given panel.
 *
 * @param props - Value to report and its label.
 * @returns The stat element.
 */
function Stat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-foreground text-lg font-bold'>{value}</span>
      <span className='text-muted-foreground text-xs'>{label}</span>
    </div>
  );
}

function GivenPanelLoading() {
  const t = useTranslations('research');
  return (
    <output
      data-testid='given-panel-loading'
      aria-busy='true'
      aria-label={t('loading_label')}
      className='flex flex-col gap-3'
    >
      <Skeleton className='h-16 w-full rounded-lg' />
      <Skeleton className='h-8 w-full rounded-lg' />
    </output>
  );
}

/**
 * Participant home summary of what the participant has given: questionnaires
 * shared, minutes of their time and studies it counts toward. Patients also
 * see the collective count for the up-next study; guests never do.
 *
 * @param props - Totals, up-next study, guest and consent status, states.
 * @returns The panel element.
 */
export default function GivenPanel({
  totals,
  upNextStudy,
  isGuest,
  isConsented = false,
  isLoading = false,
  isError = false
}: Readonly<GivenPanelProps>) {
  const t = useTranslations('research');
  const tCommon = useTranslations('common');

  if (isLoading) return <GivenPanelLoading />;
  if (isError) {
    return (
      <p
        role='alert'
        data-testid='given-panel-error'
        className='text-charcoal-700 text-sm'
      >
        {tCommon('error.title')}
      </p>
    );
  }

  return (
    <section
      data-testid='given-panel'
      aria-label={t('given.title')}
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      <h2 className='text-foreground text-base font-bold'>
        {t('given.title')}
      </h2>
      <div className='flex flex-wrap gap-6'>
        <Stat
          value={totals.questionnairesShared}
          label={t('given.questionnaires')}
        />
        <Stat value={totals.minutes} label={t('given.minutes')} />
        <Stat value={totals.studies} label={t('given.studies')} />
      </div>
      {isGuest || upNextStudy === null ? null : (
        <CollectiveGoal
          study={upNextStudy}
          isGuest={isGuest}
          isConsented={isConsented}
        />
      )}
    </section>
  );
}
