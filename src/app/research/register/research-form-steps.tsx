'use client';

import Combobox from '@/components/shared/combobox';
import QuestionnaireChip from '@/components/shared/questionnaire-chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/i18n';
import { createContext, useContext, type ReactNode } from 'react';

import type {
  Control,
  FieldErrors,
  UseFieldArrayReturn,
  UseFormReturn
} from 'react-hook-form';
import type { QuestionnaireOption } from '../shared';
import { renderOptionWithMetadata } from '../shared-components';
import type { StudyMetadataFormValues } from '../study-metadata-schema';
import { TitleStepMetadataFields } from '../title-step-metadata-fields';
import { BatchItem } from './batch-item';
import type { FormData } from './research-form';

interface TitleStepMetadata {
  groupName: string;
  control: Control<FormData>;
}

const TitleStepMetadataContext = createContext<TitleStepMetadata | null>(null);

/**
 * Provide the study metadata context to the title step.
 * @param props - group name and the form control
 * @returns the provider wrapper
 */
export function TitleStepMetadataProvider({
  value,
  children
}: Readonly<{ value: TitleStepMetadata; children: ReactNode }>) {
  return (
    <TitleStepMetadataContext.Provider value={value}>
      {children}
    </TitleStepMetadataContext.Provider>
  );
}

/**
 * Step 1: Title, Description and study metadata
 */
export function Step1({
  register,
  errors
}: Readonly<{
  register: UseFormReturn<FormData>['register'];
  errors: FieldErrors<FormData>;
}>) {
  const t = useTranslations('research');
  const metadata = useContext(TitleStepMetadataContext);
  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='title'>{t('title_label')}</Label>
        <Input
          id='title'
          {...register('title')}
          placeholder={t('study_title_placeholder')}
          className='bg-card text-foreground'
        />
        {errors.title && (
          <p className='text-danger text-sm'>{t(errors.title.message ?? '')}</p>
        )}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='description'>{t('description_label')}</Label>
        <textarea
          id='description'
          {...register('description')}
          placeholder={t('study_description_placeholder')}
          className='focus:ring-primary border-border bg-card text-foreground block w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none'
          rows={3}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='targetParticipants'>
          {t('target_participants_label')}
        </Label>
        <Input
          id='targetParticipants'
          type='number'
          min={1}
          inputMode='numeric'
          {...register('targetParticipants', {
            setValueAs: v => (v === '' ? undefined : Number(v))
          })}
          placeholder={t('target_participants_placeholder')}
          className='text-foreground'
        />
        {errors.targetParticipants && (
          <p className='text-danger text-sm'>
            {t(errors.targetParticipants.message ?? '')}
          </p>
        )}
      </div>
      {metadata && (
        <TitleStepMetadataFields
          groupName={metadata.groupName}
          // @type the title step form carries the metadata keys with the study fields
          register={
            register as unknown as UseFormReturn<StudyMetadataFormValues>['register']
          }
          control={
            metadata.control as unknown as Control<StudyMetadataFormValues>
          }
          // @type field errors of the combined form cover the metadata keys
          errors={errors}
        />
      )}
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
}: Readonly<{
  libraryOptions: QuestionnaireOption[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onOpenUploadDrawer: () => void;
}>) {
  const t = useTranslations('research');
  /** Deselect a questionnaire by its code. */
  const handleRemove = (code: string) => {
    onSelect(selectedIds.filter(id => id !== code));
  };

  return (
    <div className='space-y-4'>
      <h2 className='text-md font-bold'>{t('questionnaire_selection')}</h2>
      <Combobox
        multiple
        options={libraryOptions}
        value={selectedIds}
        onSelect={onSelect}
        placeholder={t('questionnaire_search_placeholder')}
        searchPlaceholder={t('combobox_search_placeholder')}
        emptyMessage={t('no_questionnaires')}
        renderOptionLabel={renderOptionWithMetadata}
      />
      <Button type='button' variant='outline' onClick={onOpenUploadDrawer}>
        {t('upload_custom')}
      </Button>
      {selectedIds.length > 0 && (
        <div className='space-y-2'>
          <p className='text-sm font-medium'>
            {t('selected_count', { count: selectedIds.length })}
          </p>
          <div className='space-y-2'>
            {selectedIds.map(id => {
              const option = libraryOptions.find(q => q.code === id);
              return (
                <QuestionnaireChip
                  key={id}
                  name={option?.name ?? id}
                  duration={option?.duration}
                  category={option?.category}
                  onRemove={() => {
                    handleRemove(id);
                  }}
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
}: Readonly<{
  fields: UseFieldArrayReturn<FormData, 'batches'>['fields'];
  errors: FieldErrors<FormData>;
  batches: FormData['batches'];
  setValue: UseFormReturn<FormData>['setValue'];
  onAddBatch: () => void;
  onRemoveBatch: (index: number) => void;
  lockedBatchIndices?: number[];
  availableQuestionnaires?: QuestionnaireOption[];
  selectedQuestionnaireIds?: string[];
}>) {
  const t = useTranslations('research');
  const hasQuestionnaires = availableQuestionnaires.length > 0;

  /** Toggle all unlocked batches to selected. */
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
      <h2 className='text-md font-bold'>{t('batch_configuration')}</h2>
      {hasQuestionnaires && (
        <Button type='button' variant='outline' onClick={handleSelectAll}>
          {t('select_all')}
        </Button>
      )}
      {fields.map((field, index) => (
        <BatchItem
          key={field.id}
          index={index}
          errors={errors}
          batchValues={batches[index]} // skipcq: JS-0075 - safe numeric field-array index
          setValue={setValue}
          onRemoveBatch={onRemoveBatch}
          isLocked={lockedBatchIndices.includes(index)}
          availableQuestionnaires={availableQuestionnaires}
        />
      ))}
      <Button type='button' variant='outline' onClick={onAddBatch}>
        {t('add_batch')}
      </Button>
    </div>
  );
}
