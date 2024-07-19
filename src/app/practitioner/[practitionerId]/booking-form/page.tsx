'use client'

import Header from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import withAuth from '@/hooks/withAuth'
import { ChevronDownIcon, ChevronLeftIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export interface IBookingFormProps {
  IWithAuth
  params: { practitionerId: string }
}

const BookingForm: React.FC<IBookingFormProps> = ({ params }) => {
  const router = useRouter()

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />
          <div className='text-[14px] font-bold text-white'>Booking Form</div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
        <div className='card flex flex-col items-center'>
          <div className='relative flex justify-center'>
            <Image
              className='h-[100px] w-[100px] rounded-full object-cover'
              src='/images/avatar.jpg'
              alt='clinic'
              width={100}
              height={100}
            />

            <Badge className='absolute bottom-0 flex h-[24px] min-w-[100px] justify-center bg-[#08979C] font-normal text-white'>
              Konsulin
            </Badge>
          </div>
          <div className='mt-2 text-center font-bold text-primary'>
            Nurul {params.practitionerId}
          </div>
          <div className='mt-2 flex flex-wrap justify-center gap-1'>
            <Badge className='bg-[#E1E1E1] px-2 py-[2px] font-normal'>
              Workplace
            </Badge>
            <Badge className='bg-[#E1E1E1] px-2 py-[2px] font-normal'>
              Relationship
            </Badge>
            <Badge className='bg-[#E1E1E1] px-2 py-[2px] font-normal'>
              Social Interaction
            </Badge>
          </div>
        </div>
        <div>
          <div className='mt-4 text-[12px] font-bold'>Date & Time</div>

          <div className='mt-2 flex w-full space-x-2'>
            <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
              <span className='mr-2 text-[12px] text-[#2C2F35]'>
                19 Mei 2024
              </span>
              <ChevronDownIcon size={24} color='#2C2F35' />
            </div>
            <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
              <span className='mr-2 text-[12px] text-[#2C2F35]'>10:00</span>
              <ChevronDownIcon size={24} color='#2C2F35' />
            </div>
          </div>
          <div className='mt-4 text-[12px] font-bold'>Session Type</div>
          <div className='mt-2 flex space-x-4'>
            <Select>
              <SelectTrigger className='w-[50%] text-[12px] text-[#2C2F35]'>
                <SelectValue placeholder='Session Type' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup className='text-[12px] text-[#2C2F35]'>
                  <SelectItem value='online'>Online</SelectItem>
                  <SelectItem value='Offline'>Offline</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input
              type='number'
              className='w-[50%] text-[12px] text-[#2C2F35]'
            />
          </div>
          <div className='mt-4 text-[12px] font-bold'>Problem Brief</div>
          <div className='mt-2'>
            <Textarea
              placeholder='Type your message here.'
              className='text-[12px] text-[#2C2F35]'
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default withAuth(BookingForm, ['patient'], true)
