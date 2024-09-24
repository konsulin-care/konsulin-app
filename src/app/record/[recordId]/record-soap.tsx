import { NotepadTextIcon, UsersIcon } from 'lucide-react'

export default function RecordSoap() {
  return (
    <div className='space-y-4'>
      <div className='card flex border'>
        <UsersIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <div>Participant Name</div>
      </div>

      <div className='card flex border'>
        <NotepadTextIcon className='mr-[10px]' color='hsla(220,9%,19%,0.4)' />
        <div>BIG 5 Personality Test</div>
      </div>

      <div>
        <div className='mb-2 text-[12px] text-muted'>Subjective Finding</div>

        <div className='card flex flex-col space-y-4 bg-[hsla(0,0%,98%,1)] text-[14px]'>
          <div className='flex justify-between'>
            <span className='mr-4'>Cannot Sleep </span>
            <span>1 Week</span>
          </div>
          <div className='flex justify-between'>
            <span className='mr-4'>Hard Communication</span>
            <span>5 Days</span>
          </div>
          <div className='flex justify-between'>
            <span className='mr-4'>Losing Weight </span>
            <span>5 Kg</span>
          </div>
        </div>
      </div>

      <div>
        <div className='mb-2 text-[12px] text-muted'>Other Data</div>

        <div className='card flex flex-col space-y-4 bg-[hsla(0,0%,98%,1)]'>
          <div>
            <div className='text-[12px] font-bold'>Medical History</div>
            <div className='text-[12px]'>
              Vorem ipsum dolor sit amet, consectetur adipiscing elit.k
            </div>
          </div>
          <div>
            <div className='text-[12px] font-bold'>Family History</div>
            <div className='text-[12px]'>
              Vorem ipsum dolor sit amet, consectetur adipiscing elit.k
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className='mb-2 text-[12px] text-muted'>Assessment Note</div>

        <div className='card flex text-[14px]'>
          <div>Vorem ipsum dolor sit amet, consectetur adipiscing elit.</div>
        </div>
      </div>

      <div>
        <div className='mb-2 text-[12px] text-muted'>Plan Note</div>

        <div className='card flex text-[14px]'>
          <div>Vorem ipsum dolor sit amet, consectetur adipiscing elit.</div>
        </div>
      </div>
    </div>
  )
}
