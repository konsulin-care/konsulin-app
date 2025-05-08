import { Button } from '@/components/ui/button';
import {
  DropdownMenu as Dropdown,
  DropdownMenuContent as DropdownContent,
  DropdownMenuItem as DropdownItem,
  DropdownMenuTrigger as DropdownTrigger
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { LoadingSpinnerIcon } from '../icons';

type DropdownProps = {
  options: {
    code: string;
    name: string;
  }[];
  value: string;
  placeholder: string;
  labelPlaceholder?: string;
  loading?: boolean;
  onSelect: (value: { code: string; name: string }) => void;
};

const DropdownProfile: React.FC<DropdownProps> = ({
  options,
  value,
  onSelect,
  placeholder,
  labelPlaceholder,
  loading
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [triggerRef.current?.offsetWidth]);

  return (
    <div className='w-full'>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button
            ref={triggerRef}
            variant='outline'
            className='h-[56px] w-full justify-between bg-white'
            disabled={loading}
          >
            <span className='text-sm font-normal text-[#2C2F35]'>
              {loading ? (
                <LoadingSpinnerIcon
                  width={20}
                  height={20}
                  className='w-full animate-spin'
                />
              ) : (
                (options &&
                  options.find(option => option.code === value)?.name) ||
                (!value && labelPlaceholder) ||
                placeholder ||
                'Select Option'
              )}
            </span>
            <ChevronDown
              className='ml-2 h-4 w-4 shrink-0 opacity-50'
              color='#18AAA1'
            />
          </Button>
        </DropdownTrigger>
        <DropdownContent
          style={{ minWidth: triggerWidth }}
          className='max-h-60 overflow-y-auto'
        >
          {options &&
            options.map(item => (
              <DropdownItem
                key={item.code}
                onSelect={() => onSelect(item)}
                className={`w-full ${
                  value === item.code ? 'bg-secondary text-white' : ''
                }`}
              >
                <div className='flex w-full items-center justify-between px-4 py-2'>
                  <span>{item.name}</span>
                  {value === item.code && (
                    <Check className='text-accent-foreground ml-2 h-4 w-4 text-white' />
                  )}
                </div>
              </DropdownItem>
            ))}
        </DropdownContent>
      </Dropdown>
    </div>
  );
};

export default DropdownProfile;
