'use client';

import type {
  FieldErrors,
  UseFieldArrayReturn,
  UseFormReturn
} from 'react-hook-form';
import { Step1, Step2, Step3 } from '../register/research-form-steps';
import type { QuestionnaireOption } from '../shared';
import type { FormData } from './research-form';

type Page = 'title' | 'questionnaire' | 'batch';

/** Renders the appropriate step based on effective page. */
export function RenderStep(props: {
  effectivePage: Page;
  register: UseFormReturn<FormData>['register'];
  errors: FieldErrors<FormData>;
  libraryOptions: QuestionnaireOption[];
  availableQuestionnaires: QuestionnaireOption[];
  selectedIds: string[];
  handleSelectLibrary: (ids: string[]) => void;
  handleOpenUploadDrawer: () => void;
  fields: UseFieldArrayReturn<FormData, 'batches'>['fields'];
  batches: FormData['batches'];
  setValue: UseFormReturn<FormData>['setValue'];
  append: UseFieldArrayReturn<FormData, 'batches'>['append'];
  remove: UseFieldArrayReturn<FormData, 'batches'>['remove'];
  lockedBatchIndices: number[];
}) {
  const {
    effectivePage,
    register,
    errors,
    libraryOptions,
    availableQuestionnaires,
    selectedIds,
    handleSelectLibrary,
    handleOpenUploadDrawer,
    fields,
    batches,
    setValue,
    append,
    remove,
    lockedBatchIndices
  } = props;

  return (
    <div className='space-y-4'>
      <h1 className='text-lg font-bold'>Edit Research</h1>
      {effectivePage === 'title' && (
        <Step1 register={register} errors={errors} />
      )}
      {effectivePage === 'questionnaire' && (
        <Step2
          libraryOptions={libraryOptions}
          selectedIds={selectedIds}
          onSelect={handleSelectLibrary}
          onOpenUploadDrawer={handleOpenUploadDrawer}
        />
      )}
      {effectivePage === 'batch' && (
        <Step3
          fields={fields}
          errors={errors}
          batches={batches}
          setValue={setValue}
          onAddBatch={() =>
            append({ startDate: '', endDate: '', questionnaireIds: [] })
          }
          onRemoveBatch={remove}
          lockedBatchIndices={lockedBatchIndices}
          availableQuestionnaires={availableQuestionnaires}
          selectedQuestionnaireIds={selectedIds}
        />
      )}
    </div>
  );
}
