'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TimeRange } from '@/types/availability';
import { Trash2 } from 'lucide-react';

interface TimeRangeInputProps {
  timeRange: TimeRange;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onRemove: () => void;
  showRemoveButton: boolean;
  error?: string;
}

export default function TimeRangeInput({
  timeRange,
  onFromChange,
  onToChange,
  onRemove,
  showRemoveButton,
  error
}: TimeRangeInputProps) {
  return (
    <div className='flex items-center gap-2'>
      <div className='flex flex-1 items-center gap-2'>
        <span className='text-xs text-gray-500'>From</span>
        <Input
          type='time'
          value={timeRange.from}
          onChange={e => onFromChange(e.target.value)}
          className='h-9 text-sm'
          aria-label='Start time'
        />
      </div>
      <div className='flex flex-1 items-center gap-2'>
        <span className='text-xs text-gray-500'>To</span>
        <Input
          type='time'
          value={timeRange.to}
          onChange={e => onToChange(e.target.value)}
          className={cn(
            'h-9 text-sm',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
          aria-label='End time'
          aria-invalid={!!error}
          aria-describedby={error ? `error-${timeRange.id}` : undefined}
        />
      </div>
      {showRemoveButton && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onRemove}
          className='hover:text-destructive h-9 w-9 text-gray-500'
          aria-label='Remove time range'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      )}
      {error && (
        <p id={`error-${timeRange.id}`} className='text-destructive text-xs'>
          {error}
        </p>
      )}
    </div>
  );
}
