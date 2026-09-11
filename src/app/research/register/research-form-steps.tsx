'use client';

import Combobox from '@/components/shared/combobox';
import QuestionnaireUploader from '@/components/shared/questionnaire-uploader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Questionnaire } from 'fhir/r4';
import type {
  FieldErrors,
  UseFieldArrayReturn,
  UseFormReturn
} from 'react-hook-form';
import type { FormData } from './research-form';

/**
 *
 */
export function Step1({
  onNext,
  trigger,
  register,
  errors
}: {
  onNext: (valid: boolean) => void;
  trigger: UseFormReturn<FormData>['trigger'];
  register: UseFormReturn<FormData>['register'];
  errors: FieldErrors<FormData>;
}) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        void trigger(['title', 'description']).then(onNext);
      }}
      className='space-y-4'
    >
      <div className='space-y-2'>
        <Label htmlFor='title'>Title</Label>
        <Input
          id='title'
          {...register('title')}
          placeholder='Enter study title'
          className='bg-white'
        />
        {errors.title && (
          <p className='text-sm text-red-500'>{errors.title.message}</p>
        )}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='description'>Description (optional)</Label>
        <textarea
          id='description'
          {...register('description')}
          placeholder='Enter study description'
          className='focus:ring-primary block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:outline-none'
          rows={3}
        />
      </div>
      <Button type='submit' className='w-full'>
        Next
      </Button>
    </form>
  );
}

/**
 *
 */
export function Step2({
  libraryOptions,
  selectedIds,
  onSelect,
  onBack,
  onNext,
  onCustomUpload
}: {
  libraryOptions: { code: string; name: string }[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onBack: () => void;
  onNext: () => void;
  onCustomUpload: (q: Questionnaire | null) => void;
}) {
  return (
    <div className='space-y-4'>
      <h2 className='text-md font-bold'>Questionnaire Selection</h2>
      <Accordion type='multiple' className='w-full'>
        <AccordionItem value='library'>
          <AccordionTrigger>From Library</AccordionTrigger>
          <AccordionContent>
            <Combobox
              multiple
              options={libraryOptions}
              value={selectedIds}
              onSelect={onSelect}
              placeholder='Select questionnaires'
              searchPlaceholder='Search...'
              emptyMessage='No questionnaires found.'
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='custom'>
          <AccordionTrigger>Upload Custom</AccordionTrigger>
          <AccordionContent>
            <QuestionnaireUploader value={null} onChange={onCustomUpload} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {selectedIds.length > 0 && (
        <p className='text-sm text-gray-500'>
          {selectedIds.length} questionnaire(s) selected
        </p>
      )}
      <div className='flex gap-2'>
        <Button variant='outline' onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={selectedIds.length === 0}>
          Next
        </Button>
      </div>
    </div>
  );
}

/**
 *
 */
export function Step3({
  fields,
  errors,
  register,
  onBack,
  onSubmit,
  onAddBatch,
  onRemoveBatch
}: {
  fields: UseFieldArrayReturn<FormData, 'batches'>['fields'];
  errors: FieldErrors<FormData>;
  register: UseFormReturn<FormData>['register'];
  onBack: () => void;
  onSubmit: () => void;
  onAddBatch: () => void;
  onRemoveBatch: (index: number) => void;
}) {
  return (
    <div className='space-y-4'>
      <h2 className='text-md font-bold'>Batch Configuration</h2>
      {fields.map((field, index) => (
        <div key={field.id} className='space-y-2 rounded-lg border p-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-medium'>Batch {index + 1}</h3>
            {index > 0 && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => onRemoveBatch(index)}
              >
                Remove
              </Button>
            )}
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label htmlFor={`batches.${index}.startDate`}>Start Date</Label>
              <Input
                id={`batches.${index}.startDate`}
                type='date'
                {...register(`batches.${index}.startDate`)}
                className='bg-white'
              />
              {errors.batches?.[index]?.startDate && (
                <p className='text-xs text-red-500'>
                  {errors.batches?.[index]?.startDate?.message}
                </p>
              )}
            </div>
            <div className='space-y-1'>
              <Label htmlFor={`batches.${index}.endDate`}>End Date</Label>
              <Input
                id={`batches.${index}.endDate`}
                type='date'
                {...register(`batches.${index}.endDate`)}
                className='bg-white'
              />
              {errors.batches?.[index]?.endDate && (
                <p className='text-xs text-red-500'>
                  {errors.batches?.[index]?.endDate?.message}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
      <Button type='button' variant='outline' onClick={onAddBatch}>
        Add Batch
      </Button>
      <div className='flex gap-2'>
        <Button variant='outline' onClick={onBack}>
          Back
        </Button>
        <Button type='button' onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
}
