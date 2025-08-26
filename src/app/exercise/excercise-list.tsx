'use client';

import CardLoader from '@/components/general/card-loader';
import ContentWraper from '@/components/general/content-wraper';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { useGetExercise } from '@/services/api/exercise';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function ExcerciseList() {
  const [keyWord, setKeyWord] = useState('');

  const { data: excerciseData, isLoading: excerciseIsLoading } =
    useGetExercise();

  const filteredExcerciseData = !keyWord
    ? excerciseData
    : Array.isArray(excerciseData) &&
      excerciseData.filter(
        item =>
          item.title.toLowerCase().includes(keyWord.toLowerCase()) ||
          item.description.toLowerCase().includes(keyWord.toLowerCase())
      );
  return (
    <ContentWraper>
      {/* Filter / Search */}
      <div className='p-4'>
        <InputWithIcon
          value={keyWord}
          onChange={e => setKeyWord(e.target.value)}
          placeholder='Search'
          className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
          startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
        />
      </div>

      <div className='grow p-4'>
        <div className='flex flex-col gap-y-4'>
          {excerciseIsLoading || !excerciseData ? (
            <CardLoader />
          ) : (
            Array.isArray(filteredExcerciseData) &&
            filteredExcerciseData.map(excercise => (
              <Link
                key={excercise.id}
                href={`/exercise/${excercise.id}`}
                className='card flex gap-4 bg-white'
              >
                <Image
                  src={'/images/exercise.svg'}
                  height={40}
                  width={40}
                  alt='exercise'
                />
                <div className='mt-2 flex flex-col'>
                  <span className='text-muted text-[10px]'>
                    {excercise.duration} Minutes
                  </span>
                  <span className='text-[12px] font-bold'>
                    {excercise.title}
                  </span>
                  <span className='text-muted mt-2 max-w-[250px] truncate overflow-hidden text-[10px] text-ellipsis'>
                    {excercise.description}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </ContentWraper>
  );
}
