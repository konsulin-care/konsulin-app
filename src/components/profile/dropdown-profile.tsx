import { Button } from '@/components/ui/button';
import {
  DropdownMenu as Dropdown,
  DropdownMenuContent as DropdownContent,
  DropdownMenuItem as DropdownItem,
  DropdownMenuTrigger as DropdownTrigger
} from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/i18n';
import { Check, ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { LoadingSpinnerIcon } from '../icons';

type DropdownOption = {
  code: string;
  name: string;
  roleId?: string;
};

type DropdownProps = {
  options: DropdownOption[];
  value: string;
  placeholder: string;
  labelPlaceholder?: string;
  loading?: boolean;
  onSelect: (value: DropdownOption) => void;
};

type TriggerValueProps = Omit<DropdownProps, 'onSelect'>;

/**
 * Trigger button display: loading spinner or resolved option/placeholder text.
 */
function TriggerValue({
  options,
  value,
  placeholder,
  labelPlaceholder,
  loading
}: Readonly<TriggerValueProps>) {
  const tCommon = useTranslations('common');
  return (
    <span className='text-foreground text-sm font-normal'>
      {loading ? (
        <LoadingSpinnerIcon
          width={20}
          height={20}
          className='w-full animate-spin'
        />
      ) : (
        options?.find(option => option.code === value)?.name ||
        (!value && labelPlaceholder) ||
        placeholder ||
        tCommon('select_option')
      )}
    </span>
  );
}

/** Profile dropdown selector with search and keyboard navigation. */
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
            className='bg-card h-[56px] w-full justify-between'
            disabled={loading}
          >
            <TriggerValue
              options={options}
              value={value}
              placeholder={placeholder}
              labelPlaceholder={labelPlaceholder}
              loading={loading}
            />
            <ChevronDown className='text-turquoise-deep ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </DropdownTrigger>
        <DropdownContent
          style={{ minWidth: triggerWidth }}
          className='bg-card max-h-60 overflow-y-auto'
        >
          {options?.map(item => (
            <DropdownItem
              key={item.code}
              onSelect={() => onSelect(item)}
              className={`bg-card hover:bg-muted focus:bg-muted w-full ${
                value === item.code
                  ? 'bg-accent text-accent-foreground ring-turquoise-deep ring-1'
                  : ''
              }`}
            >
              <div className='flex w-full items-center justify-between px-4 py-2'>
                <span>{item.name}</span>
                {value === item.code && (
                  <Check className='text-accent-foreground ml-2 h-4 w-4' />
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
