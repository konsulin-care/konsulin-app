import ModalQr from '@/components/general/modal-qr'
import { LinkIcon, NotepadTextIcon, UsersIcon } from 'lucide-react'

export default function RecordAssessment({ recordId }) {
  return (
    <>
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
        <ModalQr value={recordId} />
      </div>
    </>
  )
}
