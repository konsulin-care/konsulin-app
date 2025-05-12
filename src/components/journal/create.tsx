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
import { useSubmitJournal } from '@/services/api/record';
import { addDays, subDays } from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  NotepadTextIcon,
  XIcon
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import CalendarJournal from './calender-journal';
const today = new Date();

export default function CreateJournal() {
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(today);
  const [response, setResponse] = useState([]);
  const [journalTitle, setJournalTitle] = useState<string>('');
  const { mutateAsync: submitJournal, isLoading: isSubmitLoading } =
    useSubmitJournal();

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

  useEffect(addResponse, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitJournal = async () => {
    try {
      const payload = {
        valueString: journalTitle,
        resourceType: 'Observation',
        note: response,
        effectiveDateTime: date.toISOString(),
        status: 'final',
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
      console.error('Error when submitting journal: ', error);
      toast.error(error.message);
    }
  };

  const removeResponse = (index: number) => {
    setResponse(response.filter((_, find) => find != index));
  };

  const nextDay = () => {
    setDate(addDays(date, 1));
  };

  const prevDay = () => {
    setDate(subDays(date, 1));
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
      <div className='mt-[-24px] flex grow flex-col space-y-4 rounded-[16px] bg-white p-4'>
        <div>
          <div className='text-center font-bold text-muted'>Journal Entry</div>
          <div className='text-center text-muted'>
            To help you write with some thought if you need references
          </div>
        </div>

        {isAuthLoading ? (
          <Skeleton
            count={3}
            className='h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
          />
        ) : (
          <>
            <div className='card flex items-center justify-evenly bg-[hsla(0,0%,98%,1)]'>
              <Button
                onClick={prevDay}
                variant='ghost'
                className='w-fit rounded-full'
              >
                <ChevronLeftIcon color='hsla(220,9%,19%,0.4)' />
              </Button>

              <div className='flex grow flex-col items-center text-[14px]'>
                <CalendarJournal
                  value={date}
                  onChange={(newDate: Date) => setDate(newDate)}
                />
              </div>

              <Button
                onClick={nextDay}
                variant='ghost'
                className='w-fit rounded-full'
              >
                <ChevronRightIcon color='hsla(220,9%,19%,0.4)' />
              </Button>
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
                      <XIcon
                        fill='red'
                        size={12}
                        color='hsla(220,9%,19%,0.4)'
                      />
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
      </div>

      <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          {renderDrawerContent}
        </DrawerContent>
      </Drawer>
    </>
  );
}
