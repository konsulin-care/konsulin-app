'use client';

import ContentWraper from '@/components/general/content-wraper';
import { useRuntimeConfig } from '@/components/general/runtime-config-provider';
import PageHeader from '@/components/page-header';
import PageLayout from '@/components/page-layout';
import { useResearchProgress } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { sortCatalogue } from '@/utils/fhir/research-catalogue-order';
import { useMemo } from 'react';
import StudiesView from './studies-view';

/** Stable empty fallback so the memo input keeps a constant identity. */
const EMPTY_STUDIES: StudyProgress[] = [];

/**
 * All-studies route: the full active catalogue in Konsulin-first order.
 *
 * @returns The page shell with the catalogue view.
 */
export default function StudiesPage() {
  const { konsulinOrganizationId = '' } = useRuntimeConfig();
  const { data, isLoading, isError } = useResearchProgress();
  const studies = data?.studies ?? EMPTY_STUDIES;
  const catalogue = useMemo(
    () => sortCatalogue(studies, konsulinOrganizationId),
    [studies, konsulinOrganizationId]
  );

  return (
    <PageLayout variant='wide'>
      <PageHeader />
      <ContentWraper className='pt-4'>
        <div className='px-4'>
          <StudiesView
            studies={catalogue}
            konsulinOrganizationId={konsulinOrganizationId}
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </ContentWraper>
    </PageLayout>
  );
}
