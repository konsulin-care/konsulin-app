'use client';

import { useJournalForm } from '@/components/shared/hooks/useJournalForm';
import JournalResponseFields from '@/components/shared/journal-response-fields';
import JournalSubmitButton from '@/components/shared/journal-submit-button';
import JournalSuccessDrawer from '@/components/shared/journal-succes-drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { useGetSingleRecord, useUpdateJournal } from '@/services/api/record';
import { format } from 'date-fns';
import { FileCheckIcon, NotepadTextIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  readonly journalId: string;
};

/**
 *
 */
export default function EditJournal({ journalId }: Props) {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
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
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { mutateAsync: submitJournal, isLoading: isSubmitLoading } =
    useUpdateJournal();
  const { data: journalData, isLoading: isJournalLoading } = useGetSingleRecord(
    { id: journalId, resourceType: 'Observation' }
  );

  useEffect(() => {
    if (journalData) {
      setJournalTitle(journalData?.valueString || '');

      if (journalData.note.length > 0) {
        setResponse(
          journalData.note.map(item => ({
            // eslint-disable-line @typescript-eslint/no-unsafe-return
            ...item,
            id: nextId.current++
          }))
        );
      }
    }
  }, [journalData, setJournalTitle, setResponse, nextId]);

  const handleSubmitJournal = async () => {
    try {
      const payload = {
        id: journalId,
        valueString: journalTitle,
        resourceType: 'Observation',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        note: response.map(({ id, ...rest }) => rest),
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
        subject: {
          reference: `Patient/${authState.userInfo.fhirId}`
        },
        performer: [
          {
            reference: `Patient/${authState.userInfo.fhirId}`
          }
        ]
      };

      await submitJournal(payload);
      setIsOpen(true);
    } catch (error) {
      console.error('Error when updating journal: ', error);
      toast.error(error.message);
    }
  };

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

      <JournalSubmitButton
        isLoading={isSubmitLoading}
        onClick={() => {
          void handleSubmitJournal();
        }}
      />
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

      <JournalSuccessDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
