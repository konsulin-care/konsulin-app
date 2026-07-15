'use client';

import PractitionerLocationCombobox from '@/components/shared/practitioner-location-combobox';
import { Button } from '@/components/ui/button';
import {
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LocationOption {
  readonly id: string;
  readonly name: string;
}

interface RegisterPractitionerDrawerContentProps {
  readonly name: string;
  readonly email: string;
  readonly selectedLocationId: string | null;
  readonly locations: readonly LocationOption[];
  readonly isSubmitting: boolean;
  readonly isValid: boolean;
  readonly onNameChange: (value: string) => void;
  readonly onEmailChange: (value: string) => void;
  readonly onLocationSelect: (id: string | null) => void;
  readonly onRegister: () => void;
  readonly onClose: () => void;
}

/** Inner content of the Register Practitioner drawer. */
export default function RegisterPractitionerDrawerContent({
  name,
  email,
  selectedLocationId,
  locations,
  isSubmitting,
  isValid,
  onNameChange,
  onEmailChange,
  onLocationSelect,
  onRegister,
  onClose
}: RegisterPractitionerDrawerContentProps) {
  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Register Practitioner</DrawerTitle>
        <DrawerDescription>
          Add a new practitioner to your clinic.
        </DrawerDescription>
      </DrawerHeader>

      <div className='space-y-4 px-4'>
        <div>
          <Label>Location</Label>
          <PractitionerLocationCombobox
            locations={locations}
            selectedId={selectedLocationId}
            onSelect={onLocationSelect}
          />
        </div>

        <div>
          <Label htmlFor='prac-name'>Name</Label>
          <Input
            id='prac-name'
            value={name}
            onChange={e => {
              onNameChange(e.target.value);
            }}
            placeholder='Full Name'
            className='bg-white'
            aria-label='Name'
          />
        </div>

        <div>
          <Label htmlFor='prac-email'>Email</Label>
          <Input
            id='prac-email'
            type='email'
            value={email}
            onChange={e => {
              onEmailChange(e.target.value);
            }}
            placeholder='email@clinic.com'
            className='bg-white'
            aria-label='Email'
          />
        </div>
      </div>

      <DrawerFooter>
        <Button
          onClick={onRegister}
          disabled={!isValid || isSubmitting}
          variant='secondary'
          className='text-white'
        >
          {isSubmitting ? 'Registering...' : 'Register'}
        </Button>
        <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </DrawerFooter>
    </DrawerContent>
  );
}
