'use client';

import type {
  FieldErrors,
  UseFieldArrayReturn,
  UseFormReturn
} from 'react-hook-form';
import type { FormData } from './research-form';
import { Step1, Step2, Step3 } from './research-form-steps';

type Page = 'title' | 'questionnaire' | 'batch';

/** Renders the appropriate step based on effective page. */
export function RenderStep(props: {
  effectivePage: Page;
  register: UseFormReturn<FormData>['register'];
  errors: FieldErrors<FormData>;
  libraryOptions: { code: string; name: string }[];
  availableQuestionnaires: { code: string; name: string }[];
  selectedIds: string[];
  handleSelectLibrary: (ids: string[]) => void;
  handleOpenUploadDrawer: () => void;
  fields: UseFieldArrayReturn<FormData, 'batches'>['fields'];
  formValues: FormData;
  setValue: UseFormReturn<FormData>['setValue'];
  append: UseFieldArrayReturn<FormData, 'batches'>['append'];
  remove: UseFieldArrayReturn<FormData, 'batches'>['remove'];
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
    formValues,
    setValue,
    append,
    remove
  } = props;

  const createBatch = (date = ''): FormData['batches'][number] => ({
    startDate: date,
    endDate: date,
    questionnaireIds: []
  });

  return (
    <div className='space-y-4'>
      <h1 className='text-lg font-bold'>Register New Research</h1>
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
          batches={formValues.batches}
          setValue={setValue}
          onAddBatch={() => append(createBatch())}
          onRemoveBatch={remove}
          availableQuestionnaires={availableQuestionnaires}
          selectedQuestionnaireIds={selectedIds}
        />
      )}
    </div>
  );
}
