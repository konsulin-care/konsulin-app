import { CollectiveGoal } from '@/app/research/collective-goal';
import { useTranslations } from '@/i18n';
import type { ResearchStudy } from 'fhir/r4';

export type EthicsCode = 'applying' | 'approved' | 'exempt';

export interface StudySideFactsProps {
  study: ResearchStudy;
  isPatient: boolean;
  isGuest?: boolean;
  isConsented?: boolean;
  group?: string;
  lead?: string;
  ethics?: EthicsCode;
}

/**
 * Renders one label and value row.
 * @param props - label and value
 * @returns the row
 */
function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className='border-border border-b py-2'>
      <dt className='text-muted-foreground text-sm'>{label}</dt>
      <dd className='text-sm font-medium'>{value}</dd>
    </div>
  );
}

/**
 * Side facts of a study: collective count (patients only), run by, lead
 * researcher, ethics status and the platform line.
 * @param props - study, role flags and metadata
 * @returns the side facts block
 */
export function StudySideFacts({
  study,
  isPatient,
  isGuest = false,
  isConsented = false,
  group,
  lead,
  ethics
}: Readonly<StudySideFactsProps>) {
  const t = useTranslations('research');
  const ethicsText = ethics
    ? t(`side_facts.ethics_${ethics}`)
    : t('side_facts.ethics_not_stated');
  return (
    <aside className='flex flex-col gap-2'>
      {isPatient ? (
        <CollectiveGoal
          study={study}
          isGuest={isGuest}
          isConsented={isConsented}
        />
      ) : null}
      <dl>
        <Fact
          label={t('side_facts.run_by')}
          value={group || t('side_facts.run_by_fallback')}
        />
        {lead ? <Fact label={t('side_facts.lead')} value={lead} /> : null}
        <Fact label={t('side_facts.ethics')} value={ethicsText} />
      </dl>
      <p className='text-muted-foreground text-sm'>
        {t('side_facts.platform')}
      </p>
    </aside>
  );
}
