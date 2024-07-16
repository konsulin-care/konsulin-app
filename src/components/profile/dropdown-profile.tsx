import { Button } from '@/components/ui/button'
import {
  DropdownMenu as Dropdown,
  DropdownMenuContent as DropdownContent,
  DropdownMenuItem as DropdownItem,
  DropdownMenuTrigger as DropdownTrigger
} from '@/components/ui/dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import React from 'react'

type DropdownProps = {
  options: { value: string; label: string }[]
  value: string
  placeholder: string
  onSelect: (value: string) => void
}

const DropdownProfile: React.FC<DropdownProps> = ({
  options,
  value,
  onSelect,
  placeholder
}) => {
  return (
    <div className='w-full'>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button
            variant='outline'
            className='h-[56px] w-full justify-between bg-white'
          >
            {options.find(option => option.value === value)?.label ||
              placeholder ||
              'Select Option'}
            <ChevronDown
              className='ml-2 h-4 w-4 shrink-0 opacity-50'
              color='#18AAA1'
            />
          </Button>
        </DropdownTrigger>
        <DropdownContent className='w-full'>
          {options.map(item => (
            <DropdownItem
              key={item.value}
              onSelect={() => onSelect(item.value)}
              className='w-full'
            >
              <div className='flex w-full items-center justify-between px-4 py-2'>
                <span>{item.label}</span>
                {value === item.value && (
                  <Check className='text-accent-foreground ml-2 h-4 w-4' />
                )}
              </div>
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>
    </div>
  )
}

export default DropdownProfile
