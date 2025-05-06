'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth/authContext';
import { useGetJournal, useUpdateJournal } from '@/services/api/record';
import { format } from 'date-fns';
import { FileCheckIcon, NotepadTextIcon, XIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  journalId: string;
};

export default function EditJournal({ journalId }: Props) {
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState([]);
  const [journalTitle, setJournalTitle] = useState<string>('');
  const { mutateAsync: submitJournal, isLoading: isSubmitLoading } =
    useUpdateJournal();
  const { data: journalData, isLoading: isJournalLoading } =
    useGetJournal(journalId);

  const handleResponseChange = (index: number, value: string) => {
    const newResponse = [...response];
    newResponse[index].text = value;
    setResponse(newResponse);
  };

  const addResponse = () => {
    setResponse(prevState => [
      ...prevState,
      {
        text: ''
      }
    ]);
  };

  useEffect(() => {
    if (journalData) {
      setJournalTitle(journalData?.valueString || '');

      if (journalData.note.length !== 0) {
        setResponse(journalData.note);
      }
    }
  }, [journalData]);

  const handleSubmitJournal = async () => {
    try {
      const payload = {
        id: journalId,
        valueString: journalTitle,
        resourceType: 'Observation',
        note: response,
        effectiveDateTime: journalData.effectiveDateTime,
        status: 'amended',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
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

  const removeResponse = (index: number) => {
    setResponse(response.filter((_, find) => find != index));
  };

  const formattedDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy');
  };

  const renderDrawerContent = (
    <>
      <DrawerHeader className='mx-auto flex flex-col items-center gap-4 pb-0 text-[20px]'>
        <Image
          className='rounded-[8px] object-cover p-6'
          src={'/images/journal-img.png'}
          height={0}
          width={200}
          style={{ width: 'auto', height: 'auto' }}
          alt='success'
        />
        <DrawerTitle className='mb-2 text-center text-2xl font-bold'>
          Tetap Semangat Untuk Hari Ini!
        </DrawerTitle>
      </DrawerHeader>

      <DrawerDescription className='px-4 text-center text-sm opacity-50'>
        Menulis jurnal adalah langkah penting untuk memahami diri sendiri dan
        menjaga kesehatan mental Anda.
      </DrawerDescription>

      <DrawerFooter className='mt-2 flex flex-col gap-4 text-gray-600'>
        <Button
          className='h-full w-full rounded-xl bg-secondary p-4 text-white'
          onClick={() => router.push('/record')}
        >
          Back
        </Button>
      </DrawerFooter>
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
        <>
          <div className='card flex items-center bg-[hsla(0,0%,98%,1)]'>
            <FileCheckIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />

            <div className='flex grow flex-col'>
              <span className='text-[10px] text-muted'>Journal Create</span>
              <span className='text-[14px] font-bold'>
                {journalData.effectiveDateTime &&
                  formattedDate(journalData.effectiveDateTime)}
              </span>
            </div>
            <div className='flex flex-col'>
              <span className='text-right text-[10px] text-muted'>
                Last Edit
              </span>
              <span className='text-right text-[14px] font-bold'>
                {journalData.meta.lastUpdated &&
                  formattedDate(journalData.meta.lastUpdated)}
              </span>
            </div>
          </div>

          <div className='card flex border'>
            <NotepadTextIcon
              className='mr-[10px]'
              color='hsla(220,9%,19%,0.4)'
            />
            <input
              placeholder='Journal Title'
              value={journalTitle}
              onChange={e => setJournalTitle(e.target.value)}
              type='text'
              className='w-full focus:outline-none'
            />
          </div>

          <div>
            {response.map((item, index) => (
              <div className='mb-3' key={index}>
                <div className='flex items-center justify-between'>
                  <div className='mb-2 text-[12px] text-muted'>
                    Write anything here
                  </div>
                  <Button
                    onClick={() => removeResponse(index)}
                    variant='ghost'
                    className='h-fit w-fit rounded-full p-2'
                  >
                    <XIcon fill='red' size={12} color='hsla(220,9%,19%,0.4)' />
                  </Button>
                </div>

                <Textarea
                  value={item.text}
                  onChange={e => handleResponseChange(index, e.target.value)}
                  className='rounded-lg text-[14px]'
                  placeholder='Type your message here.'
                />
              </div>
            ))}
          </div>

          <div className='flex w-full justify-center'>
            <Button
              variant='ghost'
              className='text-[12px] text-muted'
              onClick={addResponse}
            >
              + Add New Thought
            </Button>
          </div>

          <Button
            onClick={handleSubmitJournal}
            className='!mt-auto w-full rounded-full bg-secondary p-4 text-[14px] text-white'
            disabled={isSubmitLoading}
          >
            {isSubmitLoading ? (
              <LoadingSpinnerIcon
                width={20}
                height={20}
                stroke='white'
                className='w-full animate-spin'
              />
            ) : (
              'Save Journal'
            )}
          </Button>
        </>
      )}

      <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          {renderDrawerContent}
        </DrawerContent>
      </Drawer>
    </>
  );
}
