'use client';

import Combobox from '@/components/shared/combobox';
import DatePickerButton from '@/components/shared/date-picker-button';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import type { FieldErrors, UseFormReturn } from 'react-hook-form';
import type { QuestionnaireOption } from '../shared';
import { renderOptionWithMetadata } from '../shared-components';
import type { FormData } from './research-form';

/**
 * Date field for batch start/end dates.
 */
export function BatchDateField({
  index,
  field,
  errors,
  currentValue,
  setValue,
  isLocked
}: Readonly<{
  index: number;
  field: 'startDate' | 'endDate';
  errors: FieldErrors<FormData>;
  currentValue: string;
  setValue: UseFormReturn<FormData>['setValue'];
  isLocked: boolean;
}>) {
  const label = field === 'startDate' ? 'Start Date' : 'End Date';
  // skipcq: JS-0075 - safe numeric array index
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

/**
 * A single batch card with date fields and questionnaire combobox.
 */
export function BatchItem({
  index,
  errors,
  batchValues,
  setValue,
  onRemoveBatch,
  isLocked,
  availableQuestionnaires = []
}: Readonly<{
  index: number;
  errors: FieldErrors<FormData>;
  batchValues: FormData['batches'][number];
  setValue: UseFormReturn<FormData>['setValue'];
  onRemoveBatch: (index: number) => void;
  isLocked: boolean;
  availableQuestionnaires?: QuestionnaireOption[];
}>) {
  const hasQuestionnaires = availableQuestionnaires.length > 0;

  const handleQuestionnaireSelect = (ids: string[]) => {
    // skipcq: JS-0098 - fire-and-forget validation
    setValue(`batches.${index}.questionnaireIds`, ids, {
      shouldValidate: true
    });
  };

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
            onClick={() => {
              onRemoveBatch(index);
            }}
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
              {batchValues.questionnaireIds
                .map(
                  id =>
                    availableQuestionnaires.find(q => q.code === id)?.name ?? id
                )
                .join(', ') || 'None assigned'}
            </p>
          ) : (
            <Combobox
              multiple
              options={availableQuestionnaires}
              value={batchValues.questionnaireIds}
              onSelect={handleQuestionnaireSelect}
              placeholder='Add questionnaire...'
              searchPlaceholder='Search...'
              emptyMessage='No questionnaires found.'
              renderOptionLabel={renderOptionWithMetadata}
            />
          )}
        </div>
      )}
    </div>
  );
}
