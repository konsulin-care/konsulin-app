'use client';

import EmptyState from '@/components/general/empty-state';
import { useRecordList } from '@/components/shared/hooks/useRecordList';
import RecordCard from '@/components/shared/record-card';
import RecordPageShell from '@/components/shared/record-page-shell';
import { useAuth } from '@/context/auth/authContext';
import {
  useFilterRecordPractitionerByDate,
  useRecordSummaryPractitioner
} from '@/services/api/record';
import { IRecord } from '@/types/record';
import { parseRecordBundlePractitioner } from '@/utils/record-parser';
import { useSearchParams } from 'next/navigation';

/**
 *
 */
export default function PractitionerRecord() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');
  const { isLoading: isAuthLoading } = useAuth();
  const { mutateAsync: getRecords, isLoading: isRecordLoading } =
    useRecordSummaryPractitioner();
  const { mutateAsync: getFilteredRecord, isLoading: isFilteredRecordLoading } =
    useFilterRecordPractitionerByDate();

  const hook = useRecordList({
    patientId,
    queryKeyPrefix: 'practitioner-records',
    summaryApi: { mutateAsync: getRecords },
    filterApi: { mutateAsync: getFilteredRecord },
    parser: parseRecordBundlePractitioner,
    profileTypes: ['Practitioner Note', 'SOAP Notes'],
    isAuthLoading,
    isSummaryLoading: isRecordLoading,
    isFilterLoading: isFilteredRecordLoading,
    queryMatcher: (record: IRecord, query: string) => {
      if (Array.isArray(record.result)) {
        return record.result.some(
          (section: { label: string; value: string }) =>
            section.label === 'Catatan Edukasi Pasien' &&
            section.value?.toLowerCase().includes(query)
        );
      }
      return (record.result as string)?.toLowerCase().includes(query);
    }
  });

  const getDescription = (record: IRecord): string => {
    if (Array.isArray(record.result)) {
      const found = record.result?.find(
        (section: { label: string }) =>
          section.label === 'Catatan Edukasi Pasien'
      );
      return found?.value?.replace(/\n\n/g, '. ') || '\\-';
    }
    if (typeof record.result === 'string' && record.result.trim()) {
      return record.result.replace(/\n\n/g, '. ');
    }
    return '\\-';
  };

  if (!patientId) {
    return (
      <EmptyState
        className='py-16'
        title='No Records Found'
        subtitle='Try different search, filter or select a patient'
      />
    );
  }

  return (
    <RecordPageShell
      pageIndicator='Summary Record'
      backRoute='/'
      ctaLink='/assessments/soap'
      ctaTitle='SOAP Report'
      ctaSubtitle='Start Writting'
      isLoading={hook.isLoading}
      filteredRecords={hook.filteredRecords}
      recordFilter={hook.recordFilter}
      filterTypeLabel={hook.filterTypeLabel}
      onSearchChange={value => hook.handleSetRecordFilter('query', value)}
      onFilterChange={filter => {
        hook.setRecordFilter(prev => ({ ...prev, ...filter }));
      }}
      renderCard={(record: IRecord) => (
        <RecordCard
          record={record}
          getPractitionerInfo={hook.getPractitionerInfo}
          showAvatarFor={['Practitioner Note', 'SOAP Notes']}
          formatTitleFor={['QuestionnaireResponse', 'SOAP Notes']}
          getDescription={getDescription}
        />
      )}
    />
  );
}
