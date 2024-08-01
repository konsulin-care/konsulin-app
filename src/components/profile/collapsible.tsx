import { ChevronDown, ChevronUp } from 'lucide-react'

function Collapsible({ day, isOpen, onToggle, children }) {
  return (
    <div className='collapsible m-2 rounded-[25px] border bg-gray-50'>
      <button
        className={`toggle flex w-full items-center justify-between rounded-[25px] p-2 text-left focus:outline-none ${
          isOpen
            ? 'bg-secondary text-[18px] font-bold text-white'
            : 'bg-transparent text-gray-700'
        }`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${day}`}
      >
        <span className='px-4'>{day}</span>
        {isOpen ? (
          <div className='pr-1'>
            <ChevronUp size={28} color='white' />
          </div>
        ) : (
          <div className='rounded-full bg-secondary p-1 text-white'>
            <ChevronDown size={26} color='white' />
          </div>
        )}
      </button>
      {isOpen && (
        <div
          id={`collapsible-content-${day}`}
          className='content rounded-b-[25px] bg-gray-50 p-4'
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default Collapsible
