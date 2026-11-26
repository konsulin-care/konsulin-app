'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import { readFindings } from '@/utils/fhir/study-findings';
import type { ResearchStudy } from 'fhir/r4';

/** Props of the researcher given-back list. */
export interface GivenBackListProps {
  /** Studies whose findings the researcher posted. */
  studies: readonly ResearchStudy[];
  /** True while the underlying research data is loading. */
  isLoading?: boolean;
  /** True when the underlying research data failed to load. */
  isError?: boolean;
}

/** One posted finding with the study it belongs to. */
interface GivenBackItem {
  /** Id of the study the finding belongs to. */
  studyId: string;
  /** Title of the study the finding belongs to. */
  studyTitle: string;
  /** Finding text in everyday language. */
  text: string;
  /** Time the finding was posted, in ISO form. */
  time: string;
}

/**
 * Collects findings from every study, newest first.
 *
 * @param studies - Studies whose notes carry findings.
 * @returns Findings with their study id and title.
 */
function collectItems(studies: readonly ResearchStudy[]): GivenBackItem[] {
  return studies
    .flatMap(study =>
      readFindings(study).map(finding => ({
        studyId: study.id ?? '',
        studyTitle: study.title ?? '',
        text: finding.text,
        time: finding.time
      }))
    )
    .toSorted((a, b) => Date.parse(b.time) - Date.parse(a.time));
}

/**
 * Shows the loading skeleton of the given-back list.
 *
 * @returns The busy output element.
 */
function GivenBackLoading() {
  const t = useTranslations('research');
  return (
    <output
      data-testid='given-back-loading'
      aria-busy='true'
      aria-label={t('loading_label')}
      className='flex flex-col gap-3'
    >
      <Skeleton className='h-16 w-full rounded-lg' />
      <Skeleton className='h-16 w-full rounded-lg' />
    </output>
  );
}

/**
 * Renders one posted finding with its study title.
 *
 * @param props - Finding to render.
 * @returns The list item element.
 */
function GivenBackRow({ item }: Readonly<{ item: GivenBackItem }>) {
  return (
    <li
      data-testid='given-back-item'
      className='border-border flex flex-col gap-1 border-b py-3 last:border-b-0'
    >
      <p className='text-charcoal-700 text-sm'>{item.text}</p>
      <p className='text-muted-foreground text-xs'>{item.studyTitle}</p>
    </li>
  );
}

/**
 * Researcher given-back list: the findings the researcher posted, newest
 * first, each with the title of the study it belongs to. Shows an empty state
 * when nothing was posted yet.
 *
 * @param props - Studies, loading flag and error flag.
 * @returns The list, loading, error or empty state element.
 */
export default function GivenBackList({
  studies,
  isLoading = false,
  isError = false
}: Readonly<GivenBackListProps>) {
  const t = useTranslations('research');
  const tCommon = useTranslations('common');

  if (isLoading) return <GivenBackLoading />;
  if (isError) {
    return (
      <p
        role='alert'
        data-testid='given-back-error'
        className='text-charcoal-700 text-sm'
      >
        {tCommon('error.title')}
      </p>
    );
  }

  const items = collectItems(studies);
  if (items.length === 0) {
    return (
      <p data-testid='given-back-empty' className='text-charcoal-700 text-sm'>
        {t('given_back.empty')}
      </p>
    );
  }

  return (
    <ul data-testid='given-back-list' className='flex flex-col'>
      {items.map(item => (
        <GivenBackRow
          key={`${item.studyId}-${item.time}-${item.text}`}
          item={item}
        />
      ))}
    </ul>
  );
}
