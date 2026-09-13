'use client';

import Combobox from '@/components/shared/combobox';
import DatePickerButton from '@/components/shared/date-picker-button';
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
  register,
  errors
}: {
  register: UseFormReturn<FormData>['register'];
  errors: FieldErrors<FormData>;
}) {
  return (
    <div className='space-y-4'>
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
    </div>
  );
}

/**
 *
 */
export function Step2({
  libraryOptions,
  selectedIds,
  onSelect,
  onCustomUpload
}: {
  libraryOptions: { code: string; name: string }[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
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
    </div>
  );
}

/**
 *
 */
export function Step3({
  fields,
  errors,
  batches,
  setValue,
  onAddBatch,
  onRemoveBatch,
  lockedBatchIndices = [],
  availableQuestionnaires = [],
  selectedQuestionnaireIds = []
}: {
  fields: UseFieldArrayReturn<FormData, 'batches'>['fields'];
  errors: FieldErrors<FormData>;
  batches: FormData['batches'];
  setValue: UseFormReturn<FormData>['setValue'];
  onAddBatch: () => void;
  onRemoveBatch: (index: number) => void;
  lockedBatchIndices?: number[];
  availableQuestionnaires?: { code: string; name: string }[];
  selectedQuestionnaireIds?: string[];
}) {
  const hasQuestionnaires = availableQuestionnaires.length > 0;

  const handleSelectAll = () => {
    for (const [index] of fields.entries()) {
      if (!lockedBatchIndices.includes(index)) {
        setValue(
          `batches.${index}.questionnaireIds`,
          selectedQuestionnaireIds,
          {
            shouldValidate: true
          }
        );
      }
    }
  };

  return (
    <div className='space-y-4'>
      <h2 className='text-md font-bold'>Batch Configuration</h2>
      {hasQuestionnaires && (
        <Button type='button' variant='outline' onClick={handleSelectAll}>
          Select all
        </Button>
      )}
      {fields.map((field, index) => (
        <BatchItem
          key={field.id}
          index={index}
          errors={errors}
          batchValues={batches[index]}
          setValue={setValue}
          onRemoveBatch={onRemoveBatch}
          isLocked={lockedBatchIndices.includes(index)}
          availableQuestionnaires={availableQuestionnaires}
        />
      ))}
      <Button type='button' variant='outline' onClick={onAddBatch}>
        Add Batch
      </Button>
    </div>
  );
}

function BatchDateField({
  index,
  field,
  errors,
  currentValue,
  setValue,
  isLocked
}: {
  index: number;
  field: 'startDate' | 'endDate';
  errors: FieldErrors<FormData>;
  currentValue: string;
  setValue: UseFormReturn<FormData>['setValue'];
  isLocked: boolean;
}) {
  const label = field === 'startDate' ? 'Start Date' : 'End Date';
  const error = errors.batches?.[index]?.[field];

  const dateValue = currentValue ? new Date(currentValue) : undefined;

  const handleChange = (date: Date) => {
    const yyyyMMdd = date.toISOString().slice(0, 10);
    // skipcq: JS-0098 - fire-and-forget validation
    setValue(`batches.${index}.${field}`, yyyyMMdd, {
      shouldValidate: true
    });
  };

  return (
    <div className='space-y-1'>
      <Label>{label}</Label>
      <DatePickerButton
        value={dateValue}
        onChange={handleChange}
        placeholder={`Select ${label.toLowerCase()}`}
        disabled={isLocked}
      />
      {error && <p className='text-xs text-red-500'>{error.message}</p>}
    </div>
  );
}

function BatchItem({
  index,
  errors,
  batchValues,
  setValue,
  onRemoveBatch,
  isLocked,
  availableQuestionnaires = []
}: {
  index: number;
  errors: FieldErrors<FormData>;
  batchValues: FormData['batches'][number];
  setValue: UseFormReturn<FormData>['setValue'];
  onRemoveBatch: (index: number) => void;
  isLocked: boolean;
  availableQuestionnaires?: { code: string; name: string }[];
}) {
  const hasQuestionnaires = availableQuestionnaires.length > 0;

  const handleQuestionnaireSelect = (ids: string[]) => {
    // skipcq: JS-0098 - fire-and-forget validation
    setValue(`batches.${index}.questionnaireIds`, ids, {
      shouldValidate: true
    });
  };

  // Find names for the selected questionnaire IDs
  const selectedNames = batchValues.questionnaireIds
    .map(id => availableQuestionnaires.find(q => q.code === id)?.name ?? id)
    .join(', ');

  return (
    <div className='space-y-2 rounded-lg border p-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>
          Batch {index + 1}
          {isLocked && (
            <span className='ml-2 text-xs text-gray-500'>(locked)</span>
          )}
        </h3>
        {index > 0 && !isLocked && (
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
        <BatchDateField
          index={index}
          field='startDate'
          errors={errors}
          currentValue={batchValues.startDate}
          setValue={setValue}
          isLocked={isLocked}
        />
        <BatchDateField
          index={index}
          field='endDate'
          errors={errors}
          currentValue={batchValues.endDate}
          setValue={setValue}
          isLocked={isLocked}
        />
      </div>
      {hasQuestionnaires && (
        <div className='space-y-1'>
          <Label>Questionnaires</Label>
          {isLocked ? (
            <p className='text-sm text-gray-700'>
              {selectedNames || 'None assigned'}
            </p>
          ) : (
            <Combobox
              multiple
              options={availableQuestionnaires}
              value={batchValues.questionnaireIds}
              onSelect={handleQuestionnaireSelect}
              placeholder='Select questionnaires'
              searchPlaceholder='Search...'
              emptyMessage='No questionnaires found.'
            />
          )}
        </div>
      )}
    </div>
  );
}
