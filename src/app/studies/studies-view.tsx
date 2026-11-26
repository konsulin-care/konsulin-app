'use client';

import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import type { StudyProgress } from '@/utils/fhir/research';
import { readStudyProfile } from '@/utils/fhir/study-profile';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  filterStudies,
  type StudyFilter,
  type StudyKindFilter,
  type StudyRunBy
} from './filter-studies';

/** Studies rendered before the show-more button. */
const PAGE_SIZE = 12;

/** Props of the all-studies catalogue view. */
export interface StudiesViewProps {
  /** Catalogue studies, already in catalogue order. */
  studies: readonly StudyProgress[];
  /** Configured Konsulin organization id, when known. */
  konsulinOrganizationId?: string;
  /** True while the catalogue is loading. */
  isLoading?: boolean;
  /** True when the catalogue failed to load. */
  isError?: boolean;
}

/** One filter group: a label and its toggle buttons. */
interface FilterGroupProps<T extends string> {
  /** Visible group label. */
  label: string;
  /** Options in display order. */
  options: ReadonlyArray<{ value: T; label: string }>;
  /** Currently selected option. */
  selected: T;
  /** Called with the newly chosen option. */
  onSelect: (value: T) => void;
}

/**
 * Renders one row of toggle buttons with aria-pressed state.
 *
 * @param props - Group label, options, selection and change handler.
 * @returns The filter group element.
 */
function FilterGroup<T extends string>({
  label,
  options,
  selected,
  onSelect
}: Readonly<FilterGroupProps<T>>) {
  return (
    <div className='flex flex-col gap-2'>
      <p className='text-muted-foreground text-xs font-bold tracking-wide uppercase'>
        {label}
      </p>
      <div className='flex flex-wrap gap-2'>
        {options.map(option => (
          <Button
            key={option.value}
            type='button'
            variant={option.value === selected ? 'action' : 'outline'}
            aria-pressed={option.value === selected}
            className='min-h-11 rounded-lg'
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders one catalogue study as a link into its study page.
 *
 * @param props - Study progress and configured Konsulin organization id.
 * @returns The study list item.
 */
function StudyRow({
  progress,
  konsulinOrganizationId
}: Readonly<{
  progress: StudyProgress;
  konsulinOrganizationId: string;
}>) {
  const t = useTranslations('research');
  const id = progress.study.id ?? '';
  const profile = readStudyProfile(progress.study, konsulinOrganizationId);
  const group = profile.groupName ?? t('side_facts.run_by_fallback');

  return (
    <li data-testid='studies-row'>
      <Link
        href={`/study?id=${id}`}
        className='border-border bg-card hover:bg-muted flex flex-col gap-1 rounded-lg border p-4'
      >
        <span className='text-foreground text-base font-bold'>
          {progress.study.title ?? ''}
        </span>
        <span className='text-muted-foreground text-xs'>{group}</span>
      </Link>
    </li>
  );
}

/** Loading placeholder of the all-studies catalogue. */
function StudiesLoading() {
  const t = useTranslations('research');
  return (
    <output
      data-testid='studies-loading'
      aria-busy='true'
      aria-label={t('loading_label')}
      className='flex flex-col gap-3'
    >
      <Skeleton className='h-5 w-48 rounded-lg' />
      <Skeleton className='h-16 w-full rounded-lg' />
      <Skeleton className='h-16 w-full rounded-lg' />
    </output>
  );
}

/**
 * All-studies catalogue: title, count line, search and two filter groups,
 * twelve rows then Show more, the no-match state, and loading and error
 * states.
 *
 * @param props - Catalogue studies, organization id and query state.
 * @returns The catalogue view.
 */
export default function StudiesView({
  studies,
  konsulinOrganizationId = '',
  isLoading = false,
  isError = false
}: Readonly<StudiesViewProps>) {
  const t = useTranslations('research');
  const tCommon = useTranslations('common');
  const [query, setQuery] = useState('');
  const [runBy, setRunBy] = useState<StudyRunBy>('all');
  const [kind, setKind] = useState<StudyKindFilter>('all');
  const [expanded, setExpanded] = useState(false);

  const filter = useMemo<StudyFilter>(
    () => ({ query, runBy, kind, konsulinOrganizationId }),
    [query, runBy, kind, konsulinOrganizationId]
  );
  const filtered = useMemo(
    () => filterStudies([...studies], filter),
    [studies, filter]
  );
  const visible = expanded ? filtered : filtered.slice(0, PAGE_SIZE);

  if (isLoading) return <StudiesLoading />;
  if (isError) {
    return (
      <p
        role='alert'
        data-testid='studies-error'
        className='text-charcoal-700 text-sm'
      >
        {tCommon('error.title')}
      </p>
    );
  }

  return (
    <div data-testid='studies-view' className='flex flex-col gap-6'>
      <header className='flex flex-col gap-2'>
        <h1 className='text-foreground text-2xl leading-tight font-bold'>
          {t('studies.title')}
        </h1>
        <p data-testid='studies-count' className='text-charcoal-700 text-sm'>
          {t('studies.count', {
            shown: visible.length,
            total: studies.length
          })}
        </p>
      </header>

      <InputWithIcon
        type='search'
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder={t('studies.search_placeholder')}
        aria-label={t('studies.search_placeholder')}
        className='bg-muted h-11 rounded-lg border-0'
      />

      <div className='flex flex-col gap-4'>
        <FilterGroup
          label={t('studies.run_by')}
          selected={runBy}
          onSelect={value => setRunBy(value)}
          options={[
            { value: 'all', label: t('studies.run_by_all') },
            { value: 'konsulin', label: t('studies.run_by_konsulin') },
            { value: 'other', label: t('studies.run_by_other') }
          ]}
        />
        <FilterGroup
          label={t('studies.kind')}
          selected={kind}
          onSelect={value => setKind(value)}
          options={[
            { value: 'all', label: t('studies.kind_all') },
            { value: 'one-time', label: t('studies.kind_one_time') },
            { value: 'repeated', label: t('studies.kind_repeated') }
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <p data-testid='studies-no-match' className='text-charcoal-700 text-sm'>
          {studies.length === 0 ? t('no_studies_title') : t('studies.no_match')}
        </p>
      ) : (
        <ul className='flex flex-col gap-3'>
          {visible.map(progress => (
            <StudyRow
              key={progress.study.id}
              progress={progress}
              konsulinOrganizationId={konsulinOrganizationId}
            />
          ))}
        </ul>
      )}

      {filtered.length > visible.length ? (
        <Button
          type='button'
          variant='link'
          data-testid='studies-show-more'
          className='min-h-11 self-start'
          onClick={() => setExpanded(true)}
        >
          {t('studies.show_more')}
        </Button>
      ) : null}
    </div>
  );
}
