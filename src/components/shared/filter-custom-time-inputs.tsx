'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  readonly startTime: string;
  readonly endTime: string;
  readonly onStartTimeChange: (value: string) => void;
  readonly onEndTimeChange: (value: string) => void;
};

/**
 *
 */
export default function FilterCustomTimeInputs({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange
}: Props) {
  return (
    <div className='mt-8 flex gap-4'>
      <div className='grid w-full max-w-sm items-center gap-1.5'>
        <Label htmlFor='start_time'>Start Time</Label>
        <Input
          onChange={e => onStartTimeChange(e.target.value)}
          value={startTime}
          id='start_time'
          className='block p-4'
          type='time'
        />
      </div>
      <div className='grid w-full max-w-sm items-center gap-1.5'>
        <Label htmlFor='end_time'>End Time</Label>
        <Input
          min={startTime}
          onChange={e => onEndTimeChange(e.target.value)}
          value={endTime}
          id='end_time'
          className='block p-4'
          type='time'
        />
      </div>
    </div>
  );
}
