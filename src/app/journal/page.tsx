'use client'

import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { createUniqueRandomRange } from '@/lib/utils'
import { addDays, subDays } from 'date-fns'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  NotepadTextIcon,
  XIcon
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CalendarJournal from './calendar-journal'
import { questionList } from './record-journal-question'
const today = new Date()

const Journal: React.FC<IWithAuth> = ({ isAuthenticated }) => {
  const router = useRouter()
  const getRandomNumber = createUniqueRandomRange(0, questionList.length)
  const [date, setDate] = useState<Date | undefined>(today)

  const [response, setResponse] = useState([])

  const handleResponseChange = (index, value) => {
    const newResponse = [...response]
    newResponse[index].answer = value
    setResponse(newResponse)
  }

  const addResponse = () => {
    setResponse(prevState => [
      ...prevState,
      {
        question: questionList[getRandomNumber()],
        answer: ''
      }
    ])
  }

  useEffect(() => addResponse(), [addResponse])

  const removeResponse = index => {
    setResponse(response.filter((_, find) => find != index))
  }

  const nextDay = () => {
    setDate(addDays(date, 1))
  }

  const prevDay = () => {
    setDate(subDays(date, 1))
  }

  return (
    <>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />

          <div className='text-[14px] font-bold text-white'>Journaling</div>
        </div>
      </Header>
      <div className='mt-[-24px] flex grow flex-col space-y-4 rounded-[16px] bg-white p-4'>
        <div>
          <div className='text-center font-bold text-muted'>Journal Entry</div>
          <div className='text-center text-muted'>
            To help you write with some thought if you need references
          </div>
        </div>

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
              onChange={newDate => setDate(newDate)}
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
          <NotepadTextIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
          <input
            placeholder='Journal Title'
            type='text'
            className='w-full focus:outline-none'
          />
        </div>

        <div>
          <div className='mb-1 text-[12px] font-bold text-muted'>
            Bingung mau mulai nulis dari mana? Coba jawab pertanyaan berikut
          </div>
          {response.map((item, index) => (
            <div className='mb-3' key={index}>
              <div className='flex items-center justify-between'>
                <div className='mb-2 text-[12px] text-muted'>
                  {item.question}
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
                value={item.answer}
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

        <Button className='!mt-auto w-full rounded-full bg-secondary p-4 text-[14px] text-white'>
          Save Journal
        </Button>
      </div>
    </>
  )
}

export default withAuth(Journal, ['patient'])
