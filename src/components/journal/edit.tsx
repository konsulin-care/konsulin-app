'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */

import { useJournalForm } from '@/components/shared/hooks/useJournalForm';
import JournalResponseFields from '@/components/shared/journal-response-fields';
import JournalSuccessDrawer from '@/components/shared/journal-succes-drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import { useGetSingleRecord, useUpdateJournal } from '@/services/api/record';
import { format } from 'date-fns';
import { FileCheckIcon, NotepadTextIcon, SavePen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  readonly journalId: string;
};

/**
 *
 */
export default function EditJournal({ journalId }: Props) {
  const { isLoading: isAuthLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const {
    response,
    journalTitle,
    nextId,
    setJournalTitle,
    setResponse,
    handleResponseChange,
    addResponse,
    removeResponse
  } = useJournalForm();
  const viewRoute = `/record?view=Observation/${journalId}`;
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { mutateAsync: submitJournal, isLoading: isSubmitLoading } =
    useUpdateJournal();
  const { data: journalData, isLoading: isJournalLoading } = useGetSingleRecord(
    { id: journalId, resourceType: 'Observation' }
  );
  const router = useRouter();
  const { setDirtyState } = useFabDirty();
  const initialValues = useRef({ title: '', notes: [] as { text: string }[] });

  useEffect(() => {
    if (journalData) {
      setJournalTitle(journalData?.valueString || '');

      if (journalData.note.length > 0) {
        setResponse(
          journalData.note.map(item => ({
            ...item,
            id: nextId.current++
          }))
        );
      }

      initialValues.current = {
        title: journalData.valueString ?? '',
        notes: (journalData.note ?? []).map(n => ({ text: n.text }))
      };
    }
  }, [journalData, setJournalTitle, setResponse, nextId]);

  /** Submit journal entry to the API, creating or updating the resource. */
  const handleSubmitJournal = useCallback(async () => {
    const hasChanges =
      journalTitle !== initialValues.current.title ||
      JSON.stringify(response.map(({ text }) => ({ text }))) !==
        JSON.stringify(initialValues.current.notes);

    if (!hasChanges) {
      router.replace(`/record?view=Observation/${journalId}`);
      return;
    }

    try {
      const payload = {
        id: journalId,
        valueString: journalTitle,
        resourceType: 'Observation',
        note: response.map(({ text }) => ({ text })),
        effectiveDateTime: journalData.effectiveDateTime,
        status: 'amended',
        code: {
          coding: [
            {
              system: 'https://loinc.org',
              code: '51855-5',
              display: 'Patient Note'
            }
          ]
        },
        subject: journalData?.subject,
        performer: journalData?.performer
      };

      await submitJournal(payload);
      setIsOpen(true);
    } catch (error) {
      console.error('Error when updating journal: ', error);
      toast.error(error.message);
    }
  }, [
    submitJournal,
    journalId,
    journalTitle,
    response,
    journalData,
    setIsOpen,
    router
  ]);

  useEffect(() => {
    setDirtyState({
      isDirty: true,
      label: 'Save Journal',
      icon: SavePen,
      onSave: () => handleSubmitJournal(),
      isSaving: isSubmitLoading
    });

    return () => setDirtyState(null);
  }, [
    journalTitle,
    response,
    isSubmitLoading,
    setDirtyState,
    handleSubmitJournal
  ]);

  /** Format an ISO date string to a human-readable Indonesian locale format. */
  const formattedDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy');
  };

  const journalInfoCard = journalData && (
    <div className='card flex items-center bg-[hsla(0,0%,98%,1)]'>
      <FileCheckIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />

      <div className='flex grow flex-col'>
        <span className='text-muted text-[10px]'>Journal Create</span>
        <span className='text-[14px] font-bold'>
          {journalData.effectiveDateTime &&
            formattedDate(journalData.effectiveDateTime)}
        </span>
      </div>
      <div className='flex flex-col'>
        <span className='text-muted text-right text-[10px]'>Last Edit</span>
        <span className='text-right text-[14px] font-bold'>
          {journalData.meta.lastUpdated &&
            formattedDate(journalData.meta.lastUpdated)}
        </span>
      </div>
    </div>
  );

  const journalContent = (
    <>
      {journalInfoCard}

      <div className='card flex border'>
        <NotepadTextIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <input
          placeholder='Journal Title'
          value={journalTitle}
          onChange={e => setJournalTitle(e.target.value)}
          type='text'
          className='w-full focus:outline-none'
        />
      </div>

      <JournalResponseFields
        response={response}
        onResponseChange={handleResponseChange}
        onRemove={removeResponse}
        onAdd={addResponse}
      />

      {/* Save handled via FAB dirty state */}
    </>
  );

  return (
    <>
      {isAuthLoading || isJournalLoading ? (
        <Skeleton
          count={3}
          className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
        />
      ) : (
        journalContent
      )}

      <JournalSuccessDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        viewRoute={viewRoute}
      />
    </>
  );
}
