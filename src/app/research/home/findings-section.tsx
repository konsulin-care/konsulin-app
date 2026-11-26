'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import type { FindingsFeedItem } from '@/utils/fhir/findings-feed';
import { useState } from 'react';

/** Number of findings shown before the show-more button. */
const VISIBLE_LIMIT = 3;

/** Props of the participant home findings section. */
export interface FindingsSectionProps {
  /** Feed built by buildFindingsFeed, in display order. */
  items: readonly FindingsFeedItem[];
  /** True while the underlying research data is loading. */
  isLoading?: boolean;
  /** True when the underlying research data failed to load. */
  isError?: boolean;
}

/**
 * Renders one finding with its source line.
 *
 * @param props - Feed item to render.
 * @returns The finding list item.
 */
function FindingCard({ item }: Readonly<{ item: FindingsFeedItem }>) {
  const t = useTranslations('research');
  const group = item.groupName ?? t('side_facts.run_by_fallback');
  const source =
    item.participantCount === undefined
      ? t('findings.source_no_count', { study: item.studyTitle, group })
      : t('findings.source', {
          study: item.studyTitle,
          group,
          count: item.participantCount
        });

  return (
    <li
      data-testid='findings-item'
      className='border-border flex flex-col gap-1 border-b py-3 last:border-b-0'
    >
      <p className='text-charcoal-700 text-sm'>{item.text}</p>
      <p
        data-testid='findings-source'
        className='text-muted-foreground text-xs'
      >
        {source}
      </p>
    </li>
  );
}

function FindingsLoading() {
  const t = useTranslations('research');
  return (
    <output
      data-testid='findings-loading'
      aria-busy='true'
      aria-label={t('loading_label')}
      className='flex flex-col gap-3'
    >
      <Skeleton className='h-16 w-full rounded-lg' />
      <Skeleton className='h-16 w-full rounded-lg' />
    </output>
  );
}

function FindingsEmpty() {
  const t = useTranslations('research');
  return (
    <p data-testid='findings-empty' className='text-charcoal-700 text-sm'>
      {t('findings.empty')}
    </p>
  );
}

/**
 * Participant home findings section: what the research team learned, in
 * everyday language. Three findings show first and Show more reveals the
 * rest. The heading comes from the page.
 *
 * @param props - Feed items and loading/error state.
 * @returns The section element.
 */
export default function FindingsSection({
  items,
  isLoading = false,
  isError = false
}: Readonly<FindingsSectionProps>) {
  const t = useTranslations('research');
  const tCommon = useTranslations('common');
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return <FindingsLoading />;
  if (isError) {
    return (
      <p
        role='alert'
        data-testid='findings-error'
        className='text-charcoal-700 text-sm'
      >
        {tCommon('error.title')}
      </p>
    );
  }
  if (items.length === 0) return <FindingsEmpty />;

  const visible = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const remaining = items.length - visible.length;

  return (
    <section
      data-testid='findings-section'
      aria-label={t('get_back_findings')}
      className='flex flex-col gap-2'
    >
      <ul className='flex flex-col'>
        {visible.map(item => (
          <FindingCard key={`${item.studyId}-${item.time}`} item={item} />
        ))}
      </ul>
      {remaining > 0 ? (
        <Button
          type='button'
          variant='link'
          data-testid='findings-show-more'
          className='min-h-11 self-start'
          onClick={() => setExpanded(true)}
        >
          {t('findings.show_more')}
        </Button>
      ) : null}
    </section>
  );
}
