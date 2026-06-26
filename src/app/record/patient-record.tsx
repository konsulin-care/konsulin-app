'use client';

import { useRecordList } from '@/components/shared/hooks/useRecordList';
import RecordCard from '@/components/shared/record-card';
import RecordPageShell from '@/components/shared/record-page-shell';
import { useAuth } from '@/context/auth/authContext';
import { useFilterRecordByDate, useRecordSummary } from '@/services/api/record';
import { IRecord } from '@/types/record';
import { parseRecordBundles } from '@/utils/record-parser';

/**
 *
 */
export default function PatientRecord() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { mutateAsync: getRecords, isLoading: isRecordLoading } =
    useRecordSummary();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { mutateAsync: getFilteredRecord, isLoading: isFilteredRecordLoading } =
    useFilterRecordByDate();
  const patientId = authState.userInfo.fhirId;

  const hook = useRecordList({
    patientId,
    queryKeyPrefix: 'patient-records',
    summaryApi: { mutateAsync: getRecords },
    filterApi: { mutateAsync: getFilteredRecord },
    parser: parseRecordBundles,
    profileTypes: ['Practitioner Note'],
    isAuthLoading,
    isSummaryLoading: isRecordLoading,
    isFilterLoading: isFilteredRecordLoading
  });

  return (
    <RecordPageShell
      pageIndicator='Summary Record'
      backRoute='/'
      ctaLink='/journal'
      ctaTitle='Start Writting'
      ctaSubtitle='Express your current feelings'
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
          showAvatarFor={['Practitioner Note']}
          formatTitleFor={['QuestionnaireResponse']}
        />
      )}
    />
  );
}
