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
import {
  checkEmailExists,
  createProfile,
  signupByEmail
} from '@/services/profile';
import { Patient } from 'fhir/r4';
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
  disabled?: boolean;
  onSelect: (value: DropdownOption) => void;
};

export default function Participant({
  list,
  value,
  onSelect,
  placeholder,
  loading,
  disabled
}: DropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [options, setOptions] = useState<DropdownOption[]>(list);

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [triggerRef.current?.offsetWidth]);

  useEffect(() => {
    setOptions(prev => {
      const listIds = new Set(list.map(o => o.patientId));
      const localOnly = prev.filter(o => !listIds.has(o.patientId));
      return [...list, ...localOnly];
    });
  }, [list]);

  const handleEmailValidation = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email address is invalid');
      return false;
    }

    setError('');
    return true;
  };

  const derivePatientName = (
    patient: Patient | null,
    fallbackEmail: string
  ) => {
    const name = patient?.name?.[0];
    if (!name) return fallbackEmail;

    if (name.text && name.text.trim() !== '') return name.text;

    const given = name.given?.join(' ').trim();
    const family = name.family?.trim();
    const combined = [given, family].filter(Boolean).join(' ').trim();

    return combined || fallbackEmail;
  };

  const handleCreatePatient = async () => {
    const isValid = handleEmailValidation();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const check = await checkEmailExists(email.trim());
      let patientId = '';
      let patientName = email.trim();

      if (check.exists && check.patientIds.length > 0) {
        patientId = check.patientIds[0];
        // If user exists, we don't fetch profile, just use email as name
      } else {
        // Create new patient
        const patient = (await createProfile({
          userId: null,
          email: email.trim(),
          type: 'Patient'
        })) as Patient;

        if (!patient || !patient.id) {
          throw new Error('Failed to create patient');
        }

        await signupByEmail(email.trim());
        patientId = patient.id;
        patientName = derivePatientName(patient, email.trim());
      }

      const newOption = {
        patientId,
        patientName
      };

      setOptions(prev => {
        const exists = prev.some(opt => opt.patientId === newOption.patientId);
        return exists ? prev : [...prev, newOption];
      });

      onSelect(newOption);
      setIsOpen(false);
      setEmail('');
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create new patient resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDialogContent = (
    <>
      <DialogHeader>
        <DialogTitle className='text-muted'>
          Create a Patient Profile
        </DialogTitle>
        <DialogDescription />
      </DialogHeader>

      <div className='space-y-4'>
        <div className='flex flex-col gap-2'>
          <Input
            type='email'
            placeholder='Enter Email Address'
            className='w-full rounded border p-2'
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
          {error && <div className='w-full text-sm text-red-500'>{error}</div>}
        </div>

        <Button
          className='bg-secondary w-full text-white'
          onClick={handleCreatePatient}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoadingSpinnerIcon
              width={20}
              height={20}
              className='w-full animate-spin'
            />
          ) : (
            'Register a Patient'
          )}
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
              className='bg-popover h-[56px] w-full justify-start'
              disabled={loading || disabled}
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
                    (options &&
                      options.length > 0 &&
                      options.find(option => option.patientId === value)
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
                New Patient
              </div>
            </DropdownItem>
            {options && options.length > 0 ? (
              options.map(item => (
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
              <div className='text-muted px-4 py-2 text-sm'>
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
