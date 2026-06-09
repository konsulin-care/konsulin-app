'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { XIcon } from 'lucide-react';

type ResponseItem = {
  readonly id: number;
  readonly text: string;
};

type Props = {
  readonly response: ResponseItem[];
  readonly onResponseChange: (index: number, value: string) => void;
  readonly onRemove: (index: number) => void;
  readonly onAdd: () => void;
};

/**
 *
 */
export default function JournalResponseFields({
  response,
  onResponseChange,
  onRemove,
  onAdd
}: Props) {
  return (
    <>
      <div>
        {response.map((item, index) => (
          <div className='mb-3' key={item.id}>
            <div className='flex items-center justify-between'>
              <div className='text-muted mb-2 text-[12px]'>
                Write anything here
              </div>
              <Button
                onClick={() => onRemove(index)}
                variant='ghost'
                className='h-fit w-fit rounded-full p-2'
              >
                <XIcon
                  fill='red'
                  size={12}
                  color='hsla(220,9%,19%,0.4)'
                  className='h-3 w-3'
                />
              </Button>
            </div>

            <Textarea
              value={item.text}
              onChange={e => onResponseChange(index, e.target.value)}
              className='rounded-lg text-[14px]'
              placeholder='Type your message here.'
            />
          </div>
        ))}
      </div>

      <div className='flex w-full justify-center'>
        <Button
          variant='ghost'
          className='text-muted text-[12px]'
          onClick={onAdd}
        >
          + Add New Thought
        </Button>
      </div>
    </>
  );
}
