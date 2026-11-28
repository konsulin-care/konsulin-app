'use client';

import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import type { ResearcherStudyStatus } from '@/utils/fhir/researcher-study-status';
import { formatBatchDate } from '@/utils/format-batch-date';

/** Props of the study status chip. */
export interface StudyStatusChipProps {
  /** Status derived by `researcherStudyStatus`. */
  status: ResearcherStudyStatus;
}

const CHIP_CLASS =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
const ACCENT_CLASS = 'bg-accent text-foreground';
const MUTED_CLASS = 'bg-muted text-charcoal-700';

/**
 * Small pill showing whether a researcher study needs a finding, is open,
 * upcoming or finished.
 *
 * @param props - The derived study status.
 * @returns The status chip element.
 */
export function StudyStatusChip({ status }: Readonly<StudyStatusChipProps>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const isFindingDue = status.kind === 'finding-due';

  const label = (() => {
    switch (status.kind) {
      case 'finding-due': {
        return t('researcher_status.finding_due');
      }
      case 'open': {
        return t('researcher_status.open', {
          date: formatBatchDate(status.closesOn, locale)
        });
      }
      case 'upcoming': {
        return t('researcher_status.upcoming', {
          date: formatBatchDate(status.opensOn, locale)
        });
      }
      default: {
        return t('researcher_status.finished');
      }
    }
  })();

  return (
    <span
      data-testid='study-status-chip'
      data-status={status.kind}
      className={`${CHIP_CLASS} ${isFindingDue ? ACCENT_CLASS : MUTED_CLASS}`}
    >
      {label}
    </span>
  );
}
