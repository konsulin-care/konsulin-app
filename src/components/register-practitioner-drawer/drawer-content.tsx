'use client';

import PractitionerLocationCombobox from '@/components/shared/practitioner-location-combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/i18n';

interface LocationOption {
  readonly id: string;
  readonly name: string;
}

interface RegisterPractitionerDrawerContentProps {
  readonly name: string;
  readonly email: string;
  readonly selectedLocationId: string | null;
  readonly locations: readonly LocationOption[];
  readonly onNameChange: (value: string) => void;
  readonly onEmailChange: (value: string) => void;
  readonly onLocationSelect: (id: string | null) => void;
}

/** Form fields of the Register Practitioner drawer (body content only). */
export default function RegisterPractitionerDrawerContent({
  name,
  email,
  selectedLocationId,
  locations,
  onNameChange,
  onEmailChange,
  onLocationSelect
}: RegisterPractitionerDrawerContentProps) {
  const t = useTranslations('common');
  return (
    <div className='space-y-4'>
      <div>
        <Label>{t('practitioner.location_label')}</Label>
        <PractitionerLocationCombobox
          locations={locations}
          selectedId={selectedLocationId}
          onSelect={onLocationSelect}
        />
      </div>

      <div>
        <Label htmlFor='prac-name'>{t('practitioner.service_name')}</Label>
        <Input
          id='prac-name'
          value={name}
          onChange={e => {
            onNameChange(e.target.value);
          }}
          placeholder={t('practitioner.full_name')}
          className='bg-white'
          aria-label={t('practitioner.full_name')}
        />
      </div>

      <div>
        <Label htmlFor='prac-email'>{t('practitioner.email')}</Label>
        <Input
          id='prac-email'
          type='email'
          value={email}
          onChange={e => {
            onEmailChange(e.target.value);
          }}
          placeholder={t('practitioner.email_placeholder')}
          className='bg-white'
          aria-label={t('practitioner.email')}
        />
      </div>
    </div>
  );
}
