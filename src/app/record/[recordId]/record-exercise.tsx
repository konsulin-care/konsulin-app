import { FileCheckIcon, NotepadTextIcon, UsersIcon } from 'lucide-react'

export default function RecordExercise() {
  return (
    <div className='space-y-4'>
      <div className='card flex border'>
        <UsersIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <div>Participant Name</div>
      </div>
      <div className='card flex border'>
        <NotepadTextIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <div>Self-Compasion/Kindness Meditation</div>
      </div>
      <div className='card flex bg-[hsla(0,0%,98%,1)]'>
        <FileCheckIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />

        <div className='flex grow flex-col'>
          <span className='text-[10px] text-muted'>Completetion</span>
          <span className='text-[14px] font-bold'>Not Fully Complete</span>
        </div>
        <div className='flex flex-col'>
          <span className='text-right text-[10px] text-muted'>Stop at</span>
          <span className='text-right text-[14px] font-bold'>11:12/15:40</span>
        </div>
      </div>
      <div className='card flex bg-[hsla(0,0%,98%,1)] text-[14px] font-bold'>
        <div className='mr-auto'>Times Do the exercise</div>
        <div>1st</div>
      </div>
    </div>
  )
}
