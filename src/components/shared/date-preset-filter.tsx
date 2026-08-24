'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';

type DatePreset = {
  readonly label: string;
  readonly value: { readonly start: Date; readonly end: Date };
};

type Props = {
  readonly presets: DatePreset[];
  readonly activeStart?: Date;
  readonly activeEnd?: Date;
  readonly isCustom: boolean;
  readonly onPresetSelect: (start: Date, end: Date) => void;
  readonly onCustomOpen: () => void;
};

/**
 *
 */
export default function DatePresetFilter({
  presets,
  activeStart,
  activeEnd,
  isCustom,
  onPresetSelect,
  onCustomOpen
}: Props) {
  const getCustomLabel = (): string | undefined => {
    // skipcq: JS-D1001 — self-explanatory helper
    if (!activeStart || !activeEnd) return undefined;
    if (activeStart === activeEnd) return format(activeStart, 'dd MMM yy');
    return `${format(activeStart, 'dd MMM yy')} - ${format(activeEnd, 'dd MMM yy')}`;
  };

  const customLabel = getCustomLabel();

  return (
    <div className='card mt-4 border-0 bg-[#F9F9F9]'>
      <div className='mb-4 font-bold'>Date</div>
      <div className='flex flex-wrap gap-[10px]'>
        {presets.map(date => (
          <Button
            key={date.label}
            onClick={() => onPresetSelect(date.value.start, date.value.end)}
            variant='outline'
            className={cn(
              'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
              activeStart &&
                activeEnd &&
                isSameDay(activeStart, date.value.start) &&
                isSameDay(activeEnd, date.value.end)
                ? 'bg-secondary hover:bg-secondary font-bold text-white'
                : 'bg-white font-normal'
            )}
          >
            {date.label}
          </Button>
        ))}
        <Button
          variant='outline'
          onClick={onCustomOpen}
          className={cn(
            'h-[50px] w-min items-center justify-center rounded-lg border-0 p-4 text-[12px]',
            isCustom
              ? 'bg-secondary hover:bg-secondary font-bold text-white'
              : 'bg-white font-normal'
          )}
        >
          Custom
          {customLabel && ` : ${customLabel}`}
        </Button>
      </div>
    </div>
  );
}
