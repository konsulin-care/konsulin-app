'use client';

import Combobox from '@/components/shared/combobox';
import QuestionnaireChip from '@/components/shared/questionnaire-chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReactNode } from 'react';
import type {
  FieldErrors,
  UseFieldArrayReturn,
  UseFormReturn
} from 'react-hook-form';
import type { QuestionnaireOption } from '../shared';
import { BatchItem } from './batch-item';
import type { FormData } from './research-form';

/** Renders option name with optional metadata line (duration, category). */
function renderOptionWithMetadata(option: {
  name: string;
  duration?: number | null;
  category?: string | null;
}): ReactNode {
  const hasMetadata = option.duration != null || option.category != null;
  return (
    <div className='flex flex-col'>
      <span>{option.name}</span>
      {hasMetadata && (
        <span className='text-muted-foreground text-xs'>
          {[
            option.duration == null ? null : `${option.duration} min`,
            option.category
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      )}
    </div>
  );
}

/**
 * Step 1: Title & Description
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
 * Step 2: Questionnaire Selection
 *
 * Combobox at top, upload button below, selected chips at bottom.
 */
export function Step2({
  libraryOptions,
  selectedIds,
  onSelect,
  onOpenUploadDrawer
}: {
  libraryOptions: QuestionnaireOption[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onOpenUploadDrawer: () => void;
}) {
  const handleRemove = (code: string) => {
    onSelect(selectedIds.filter(id => id !== code));
  };

  return (
    <div className='space-y-4'>
      <h2 className='text-md font-bold'>Questionnaire Selection</h2>
      <Combobox
        multiple
        options={libraryOptions}
        value={selectedIds}
        onSelect={onSelect}
        placeholder='Search questionnaires...'
        searchPlaceholder='Search...'
        emptyMessage='No questionnaires found.'
        renderOptionLabel={renderOptionWithMetadata}
      />
      <Button type='button' variant='outline' onClick={onOpenUploadDrawer}>
        Upload Custom Questionnaire
      </Button>
      {selectedIds.length > 0 && (
        <div className='space-y-2'>
          <p className='text-sm font-medium'>Selected ({selectedIds.length})</p>
          <div className='space-y-2'>
            {selectedIds.map(id => {
              const option = libraryOptions.find(q => q.code === id);
              return (
                <QuestionnaireChip
                  key={id}
                  name={option?.name ?? id}
                  duration={option?.duration}
                  category={option?.category}
                  onRemove={() => handleRemove(id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Step 3: Batch Configuration
 *
 * Each batch has date fields and a multi-select combobox with metadata.
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
  availableQuestionnaires?: QuestionnaireOption[];
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
