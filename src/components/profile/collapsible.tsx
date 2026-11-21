import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 *
 */
function Collapsible({
  day,
  isOpen,
  onToggle,
  children,
  hasSchedules
}: Readonly<{
  day: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasSchedules?: boolean;
}>) {
  return (
    <div className='collapsible bg-muted m-2 rounded-[25px] border'>
      <button
        className={`toggle flex w-full items-center justify-between rounded-[25px] p-2 text-left focus:outline-none ${
          isOpen
            ? 'bg-accent text-accent-foreground ring-turquoise-deep py-4 text-[18px] font-bold ring-1'
            : 'text-charcoal-700 bg-transparent'
        }`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${day}`}
      >
        <span className='px-4'>{day}</span>
        {isOpen ? (
          <div className='pr-1'>
            <ChevronUp size={28} color='currentColor' />
          </div>
        ) : (
          <div
            className={`rounded-full p-1 ${hasSchedules ? 'bg-turquoise-deep' : 'bg-card'}`}
          >
            <ChevronDown
              size={26}
              color={hasSchedules ? 'white' : 'currentColor'}
            />
          </div>
        )}
      </button>
      {isOpen && (
        <div
          id={`collapsible-content-${day}`}
          className='content bg-muted rounded-b-[25px] p-4'
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default Collapsible;
