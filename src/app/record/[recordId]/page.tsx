'use client'

import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import {
  ChevronLeftIcon,
  LinkIcon,
  NotepadTextIcon,
  UsersIcon
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'

export interface IDetailClinic extends IWithAuth {
  params: { recordId: string }
}

const RecordDetail: React.FC<IDetailClinic> = ({ isAuthenticated, params }) => {
  const router = useRouter()

  const modalQR = () => {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button className='rounded-xl bg-secondary text-white'>
            Show QR
          </Button>
        </DrawerTrigger>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          <QRCode
            size={150}
            style={{
              height: '290px',
              maxWidth: '100%',
              width: '100%',
              margin: '32px 0'
            }}
            value={params.recordId}
            viewBox={`0 0 256 256`}
          />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <div>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />

          <div className='text-[14px] font-bold text-white'>Self Excercise</div>
        </div>
      </Header>
      <div className='mt-[-24px] min-h-screen rounded-[16px] bg-white p-4'>
        <div className='mb-4'>
          <div className='text-[14px] font-bold text-muted'>
            Assessment Details
          </div>
          <div className='text-[10px] text-muted'>Assessment - User</div>
        </div>
        <div className='card mb-4 flex items-center'>
          <UsersIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
          Participant Name
        </div>
        <div className='card mb-4 flex items-center'>
          <NotepadTextIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
          BIG 5 Personality Test
        </div>

        <div className='mb-4'>
          <div className='text-12 mb-2 text-muted'>Result Brief</div>
          <div className='card'>
            Vorem ipsum dolor sit amet, consectetur adipiscing elit.
          </div>
        </div>

        <div className='mb-4'>
          <div className='text-12 mb-2 text-muted'>Result Tables</div>
          <div className='space-y-2 rounded-lg bg-[#F9F9F9] p-4'>
            <div>Variable A</div>
            <div>Variable B</div>
            <div>Variable C</div>
            <div>Variable D</div>
          </div>
        </div>

        <div className='flex items-center space-x-2 rounded-lg bg-[#F9F9F9] p-4'>
          <LinkIcon />
          <div className='flex grow flex-col'>
            <span className='text-[10px] text-muted'>Test Akses</span>
            <span className='text-[14px] font-bold'>QR Code</span>
          </div>
          {modalQR()}
        </div>
      </div>
    </div>
  )
}

export default withAuth(RecordDetail, ['patient'])
