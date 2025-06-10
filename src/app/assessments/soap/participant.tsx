import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu as Dropdown,
  DropdownMenuContent as DropdownContent,
  DropdownMenuItem as DropdownItem,
  DropdownMenuTrigger as DropdownTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Plus, UsersIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type DropdownOption = {
  patientId: string;
  patientName: string;
};

type DropdownProps = {
  list: DropdownOption[];
  value: string;
  placeholder: string;
  loading?: boolean;
  onSelect: (value: DropdownOption) => void;
};

export default function Participant({
  list,
  value,
  onSelect,
  placeholder,
  loading
}: DropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [triggerRef.current?.offsetWidth]);

  const handleEmailValidation = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email tidak valid');
      return;
    }

    setError('');
  };

  const renderDialogContent = (
    <>
      <DialogHeader>
        <DialogTitle className='text-muted'>Buat Profil Pasien</DialogTitle>
        <DialogDescription />
      </DialogHeader>

      <div className='space-y-4'>
        <div className='flex flex-col gap-2'>
          <Input
            type='email'
            placeholder='Masukkan email'
            className='w-full rounded border p-2'
            onChange={e => setEmail(e.target.value)}
          />
          {error && <div className='w-full text-sm text-red-500'>{error}</div>}
        </div>

        {/* TODO: add new patient feature */}
        <Button
          className='w-full bg-secondary text-white'
          onClick={handleEmailValidation}
        >
          Daftarkan Pasien
        </Button>
      </div>

      <DialogFooter>
        <DialogClose asChild />
      </DialogFooter>
    </>
  );

  return (
    <>
      <div className='w-full'>
        <Dropdown>
          <DropdownTrigger asChild>
            <Button
              ref={triggerRef}
              variant='outline'
              className='h-[56px] w-full justify-start bg-white'
              disabled={loading}
            >
              <UsersIcon color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
              <div className='flex w-full items-center justify-between'>
                <span className='text-sm font-normal text-[#2C2F35]'>
                  {loading ? (
                    <LoadingSpinnerIcon
                      width={20}
                      height={20}
                      className='w-full animate-spin'
                    />
                  ) : (
                    (list &&
                      list.find(option => option.patientId === value)
                        ?.patientName) ||
                    placeholder
                  )}
                </span>
                <ChevronDown
                  className='ml-2 h-4 w-4 shrink-0 opacity-50'
                  color='#18AAA1'
                />
              </div>
            </Button>
          </DropdownTrigger>
          <DropdownContent
            style={{ minWidth: triggerWidth }}
            className='max-h-60 overflow-y-auto'
          >
            <DropdownItem
              className='w-full cursor-pointer'
              onSelect={() => setIsOpen(true)}
            >
              <div className='flex w-full items-center justify-start p-1'>
                <Plus color='hsla(220,9%,19%,0.4)' className='mr-[10px]' />
                Pasien Baru
              </div>
            </DropdownItem>
            {list ? (
              list.map(item => (
                <DropdownItem
                  key={item.patientId}
                  onSelect={() => onSelect(item)}
                  className={`w-full cursor-pointer ${
                    value === item.patientId ? 'bg-secondary text-white' : ''
                  }`}
                >
                  <div className='flex w-full items-center justify-start p-1'>
                    <UsersIcon
                      color='hsla(220,9%,19%,0.4)'
                      className='mr-[10px]'
                    />
                    <span>{item.patientName}</span>
                    {value === item.patientId && (
                      <Check className='text-accent-foreground ml-2 h-4 w-4 text-white' />
                    )}
                  </div>
                </DropdownItem>
              ))
            ) : (
              <div className='px-4 py-2 text-sm text-muted'>
                No patient today
              </div>
            )}
          </DropdownContent>
        </Dropdown>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>{renderDialogContent}</DialogContent>
      </Dialog>
    </>
  );
}
