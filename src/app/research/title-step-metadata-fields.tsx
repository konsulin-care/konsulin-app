'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/i18n';
import type { Control, FieldErrors, UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import {
  ETHICS_STATUSES,
  type StudyMetadataFormValues
} from './study-metadata-schema';

/** Message keys for the ethics radio options. */
const ETHICS_LABEL_KEYS = {
  applying: 'side_facts.ethics_applying',
  approved: 'side_facts.ethics_approved',
  exempt: 'side_facts.ethics_exempt'
} as const;

interface TitleStepMetadataFieldsProps {
  groupName: string;
  register: UseFormReturn<StudyMetadataFormValues>['register'];
  control: Control<StudyMetadataFormValues>;
  errors: FieldErrors<StudyMetadataFormValues>;
}

/**
 * Study metadata fields shown on the title step of the researcher form.
 * The group name is read-only because it comes from the organization.
 * @param props - group name, react-hook-form register, control and errors
 * @returns the metadata field block
 */
export function TitleStepMetadataFields({
  groupName,
  register,
  control,
  errors
}: Readonly<TitleStepMetadataFieldsProps>) {
  const t = useTranslations('research');
  const ethicsStatus = useWatch({ control, name: 'ethicsStatus' });
  const isApproved = ethicsStatus === 'approved';

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='metadata-group'>{t('metadata.group')}</Label>
        <Input
          id='metadata-group'
          value={groupName}
          readOnly
          className='text-foreground'
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='metadata-question'>{t('metadata.question')}</Label>
        <textarea
          id='metadata-question'
          {...register('researchQuestion')}
          className='focus:ring-primary border-border bg-card text-foreground block w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none'
          rows={3}
        />
        {errors.researchQuestion && (
          <p className='text-danger text-sm'>
            {t(errors.researchQuestion.message ?? '')}
          </p>
        )}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='metadata-who'>{t('metadata.who')}</Label>
        <Input
          id='metadata-who'
          {...register('whoCanJoin')}
          className='text-foreground'
        />
      </div>
      <fieldset className='space-y-2'>
        <legend className='text-sm font-medium'>{t('metadata.ethics')}</legend>
        {ETHICS_STATUSES.map(status => (
          <label
            key={status}
            className='flex min-h-11 items-center gap-2 text-sm'
          >
            <input
              type='radio'
              value={status}
              {...register('ethicsStatus')}
              className='accent-primary h-4 w-4'
            />
            <span>{t(ETHICS_LABEL_KEYS[status])}</span>
          </label>
        ))}
        {isApproved && (
          <div className='space-y-2'>
            <Label htmlFor='metadata-ethics-reference'>
              {t('metadata.ethics_reference')}
            </Label>
            <Input
              id='metadata-ethics-reference'
              {...register('ethicsReference')}
              className='text-foreground'
            />
          </div>
        )}
      </fieldset>
      <label className='flex min-h-11 items-center gap-2 text-sm'>
        <input
          type='checkbox'
          {...register('sharesFindings')}
          className='accent-primary h-4 w-4 rounded'
        />
        <span>{t('metadata.findings')}</span>
      </label>
    </div>
  );
}
