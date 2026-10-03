import type { ReactNode } from 'react';
import type {
  FieldArrayWithId,
  FieldErrors,
  UseFieldArrayReturn,
  UseFormReturn
} from 'react-hook-form';
import { Step1, Step2, Step3 } from './register/research-form-steps';
import type { QuestionnaireOption } from './shared';

/** Renders option name with optional metadata line (duration, category). */
export function renderOptionWithMetadata(option: {
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

type Page = 'title' | 'questionnaire' | 'batch';

interface BatchFormData {
  title: string;
  description?: string;
  batches: { startDate: string; endDate: string; questionnaireIds: string[] }[];
}

/** Shared step renderer for register and edit research forms. */
export function RenderStep(
  props: Readonly<{
    effectivePage: Page;
    title: string;
    // @type react-hook-form pass-through: Step1/Step2/Step3 enforce per-step types
    register: UseFormReturn<BatchFormData>['register'];
    errors: FieldErrors<BatchFormData>;
    libraryOptions: QuestionnaireOption[];
    availableQuestionnaires: QuestionnaireOption[];
    selectedIds: string[];
    handleSelectLibrary: (ids: string[]) => void;
    handleOpenUploadDrawer: () => void;
    fields: FieldArrayWithId<BatchFormData, 'batches'>[];
    batches: BatchFormData['batches'];
    setValue: UseFormReturn<BatchFormData>['setValue'];
    append: UseFieldArrayReturn<BatchFormData, 'batches'>['append'];
    remove: UseFieldArrayReturn<BatchFormData, 'batches'>['remove'];
    lockedBatchIndices?: number[];
  }>
) {
  const {
    effectivePage,
    title,
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
    lockedBatchIndices = []
  } = props;

  return (
    <div className='space-y-4'>
      <h1 className='text-lg font-bold'>{title}</h1>
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
          onAddBatch={() => {
            append({ startDate: '', endDate: '', questionnaireIds: [] });
          }}
          onRemoveBatch={remove}
          lockedBatchIndices={lockedBatchIndices}
          availableQuestionnaires={availableQuestionnaires}
          selectedQuestionnaireIds={selectedIds}
        />
      )}
    </div>
  );
}
