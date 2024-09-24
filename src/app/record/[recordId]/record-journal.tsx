import { FileCheckIcon, NotepadTextIcon } from 'lucide-react'

export default function RecordJournal() {
  return (
    <div className='space-y-4'>
      <div className='card flex bg-[hsla(0,0%,98%,1)]'>
        <FileCheckIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />

        <div className='flex grow flex-col'>
          <span className='text-[10px] text-muted'>Journal Create</span>
          <span className='text-[14px] font-bold'>1 Mei 2024</span>
        </div>
        <div className='flex flex-col'>
          <span className='text-right text-[10px] text-muted'>Last Edit</span>
          <span className='text-right text-[14px] font-bold'>12 Mei 2024</span>
        </div>
      </div>

      <div className='card flex border'>
        <NotepadTextIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <div>Journal Title</div>
      </div>

      <div>
        <div className='mb-2 text-[12px] text-muted'>Write anything here</div>

        <div className='card flex text-[14px]'>
          <div>Vorem ipsum dolor sit amet, consectetur adipiscing elit.</div>
        </div>
      </div>
    </div>
  )
}
