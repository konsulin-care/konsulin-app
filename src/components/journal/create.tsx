'use client';
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

import { useJournalForm } from '@/components/shared/hooks/useJournalForm';
import JournalResponseFields from '@/components/shared/journal-response-fields';
import JournalSuccessDrawer from '@/components/shared/journal-succes-drawer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useSubmitJournal } from '@/services/api/record';
import { addDays, subDays } from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  NotepadTextIcon,
  SavePen
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import CalendarJournal from './calender-journal';
const today = new Date();

/**
 *
 */
export default function CreateJournal() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(today);
  const {
    response,
    journalTitle,
    setJournalTitle,
    handleResponseChange,
    addResponse,
    removeResponse
  } = useJournalForm(1);
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { mutateAsync: submitJournal, isLoading: isSubmitLoading } =
    useSubmitJournal();
  const { dispatch } = useFab();

  /** Submits a journal entry to the server. */
  const handleSubmitJournal = useCallback(async () => {
    try {
      const payload = {
        valueString: journalTitle,
        resourceType: 'Observation',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        note: response.map(({ id, ...rest }) => rest),
        effectiveDateTime: date.toISOString(),
        status: 'final',
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
      console.error('Error when submitting journal: ', error);
      toast.error(error.message);
    }
  }, [authState, submitJournal, journalTitle, response, date, setIsOpen]);

  useEffect(() => {
    const titleReady = journalTitle.trim().length >= 3;
    const contentWords = response
      .flatMap(r => r.text.trim().split(/\s+/))
      .filter(Boolean).length;
    const contentReady = contentWords >= 2;

    if (titleReady && contentReady) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Save Journal',
          icon: SavePen,
          onAction: () => handleSubmitJournal(),
          isSaving: isSubmitLoading,
          variant: 'primary'
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }

    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [journalTitle, response, isSubmitLoading, dispatch, handleSubmitJournal]);

  /** Increment selected date by one day. */
  const nextDay = () => {
    setDate(addDays(date, 1));
  };

  /** Decrement selected date by one day. */
  const prevDay = () => {
    setDate(subDays(date, 1));
  };

  const datePicker = (
    <div className='card flex items-center justify-evenly bg-[hsla(0,0%,98%,1)]'>
      <Button onClick={prevDay} variant='ghost' className='w-fit rounded-full'>
        <ChevronLeftIcon color='hsla(220,9%,19%,0.4)' />
      </Button>

      <div className='flex grow flex-col items-center text-[14px]'>
        <CalendarJournal
          value={date}
          onChange={(newDate: Date) => setDate(newDate)}
        />
      </div>

      <Button onClick={nextDay} variant='ghost' className='w-fit rounded-full'>
        <ChevronRightIcon color='hsla(220,9%,19%,0.4)' />
      </Button>
    </div>
  );

  const journalForm = (
    <>
      {datePicker}

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
      <div className='mt-[-24px] flex grow flex-col space-y-4 rounded-[16px] bg-white p-4'>
        <div>
          <div className='text-muted text-center font-bold'>Journal Entry</div>
          <div className='text-muted text-center'>
            To help you write with some thought if you need references
          </div>
        </div>

        {isAuthLoading ? (
          <Skeleton
            count={3}
            className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
          />
        ) : (
          journalForm
        )}
      </div>

      <JournalSuccessDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
