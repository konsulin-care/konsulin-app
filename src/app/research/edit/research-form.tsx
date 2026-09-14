'use client';

import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type {
  Bundle,
  PlanDefinition,
  Questionnaire,
  ResearchStudy
} from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { schema } from '../register/research-form';
import { Step1, Step2, Step3 } from '../register/research-form-steps';
import { ResearchFormActionsProvider } from '../research-form-actions-context';
import { submitEditStudy } from './submit-helpers';

export type FormData = z.infer<typeof schema>;

type Page = 'title' | 'questionnaire' | 'batch';

const VALID_PAGES = new Set<Page>(['title', 'questionnaire', 'batch']);

interface EditResearchFormProps {
  study: ResearchStudy;
  planDefinitions: PlanDefinition[];
}

const extractIdFromReference = (ref?: string): string | null => {
  if (!ref) return null;
  const parts = ref.split('/').filter(Boolean);
  return parts.at(-1) ?? null;
};

const mapToFormData = (
  study: ResearchStudy,
  planDefinitions: PlanDefinition[]
): FormData => ({
  title: study.title ?? '',
  description: study.description ?? '',
  batches: planDefinitions
    .toSorted((a, b) =>
      (a.effectivePeriod?.start ?? '').localeCompare(
        b.effectivePeriod?.start ?? ''
      )
    )
    .map(plan => ({
      startDate: plan.effectivePeriod?.start ?? '',
      endDate: plan.effectivePeriod?.end ?? '',
      questionnaireIds: (plan.action ?? [])
        .map(a => extractQuestionnaireId(a.definitionCanonical))
        .filter((id): id is string => id !== null)
    }))
});

const mapToPlanIds = (
  study: ResearchStudy,
  planDefinitions: PlanDefinition[]
): string[] => {
  const planIdMap = new Map(planDefinitions.map(p => [p.id, p.id]));
  return (study.protocol ?? [])
    .map(ref => extractIdFromReference(ref.reference))
    .filter((id): id is string => id !== null && planIdMap.has(id));
};

const computeLockedBatchIndices = (batches: FormData['batches']): number[] => {
  const today = new Date().toISOString().slice(0, 10);
  return batches
    .map((batch, i) => ({ batch, i }))
    .filter(
      ({ batch }) =>
        batch.endDate < today ||
        (batch.startDate <= today && batch.endDate >= today)
    )
    .map(({ i }) => i);
};

/** Fetches questionnaire library from FHIR API. */
async function fetchLibraryQuestionnaires() {
  const API = await getAPI();
  const res = await API.get<Bundle>(
    '/fhir/Questionnaire?context=popular,regular&status=active&_elements=id,title,description,extension'
  );
  return (res.data.entry ?? []).map(e => e.resource as Questionnaire);
}

/** Maps raw questionnaires to combobox options. */
function libraryOptionsFromQuery(qs: Questionnaire[]) {
  return qs.map(q => ({
    code: q.id ?? '',
    name: q.title ?? q.id ?? ''
  }));
}

/** Renders the appropriate step based on effective page. */
function renderStep({
  effectivePage,
  register,
  errors,
  libraryOptions,
  selectedIds,
  handleSelectLibrary,
  handleCustomUpload,
  fields,
  formValues,
  setValue,
  append,
  remove,
  lockedBatchIndices
}: {
  effectivePage: Page;
  register: ReturnType<typeof useForm<FormData>>['register'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
  libraryOptions: { code: string; name: string }[];
  selectedIds: string[];
  handleSelectLibrary: (ids: string[]) => void;
  handleCustomUpload: (q: Questionnaire | null) => void;
  fields: ReturnType<typeof useFieldArray<FormData, 'batches'>>['fields'];
  formValues: FormData;
  setValue: ReturnType<typeof useForm<FormData>>['setValue'];
  append: ReturnType<typeof useFieldArray<FormData, 'batches'>>['append'];
  remove: ReturnType<typeof useFieldArray<FormData, 'batches'>>['remove'];
  lockedBatchIndices: number[];
}) {
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
          onCustomUpload={handleCustomUpload}
        />
      )}
      {effectivePage === 'batch' && (
        <Step3
          fields={fields}
          errors={errors}
          batches={formValues.batches}
          setValue={setValue}
          onAddBatch={() =>
            append({ startDate: '', endDate: '', questionnaireIds: [] })
          }
          onRemoveBatch={remove}
          lockedBatchIndices={lockedBatchIndices}
          availableQuestionnaires={libraryOptions}
          selectedQuestionnaireIds={selectedIds}
        />
      )}
    </div>
  );
}

/**
 * Edit form for an existing research study.
 *
 * Fetches the study and its PlanDefinitions, maps them to form data,
 * and submits changes via a FHIR transaction bundle.
 */
export default function EditResearchForm({
  study,
  planDefinitions
}: Readonly<EditResearchFormProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  useAuth();
  const initialData = useMemo(
    () => mapToFormData(study, planDefinitions),
    [study, planDefinitions]
  );
  const planIds = useMemo(
    () => mapToPlanIds(study, planDefinitions),
    [study, planDefinitions]
  );
  const lockedBatchIndices = useMemo(
    () => computeLockedBatchIndices(initialData.batches),
    [initialData.batches]
  );

  // Derive page from URL params
  const rawPage = searchParams.get('page');
  const page: Page = VALID_PAGES.has(rawPage as Page)
    ? (rawPage as Page)
    : 'title';

  // Fix questionnaire bug: initialize selectedIds from existing batches
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialData.batches.flatMap(b => b.questionnaireIds)
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData
  });

  const {
    register,
    control,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors }
  } = form;
  const { fields, append, remove } = useFieldArray<FormData>({
    control,
    name: 'batches'
  });

  const formValues = form.watch();

  // Deep link guard
  const shouldRedirect = page !== 'title' && !formValues.title;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace('/research/edit?page=title');
    }
  }, [shouldRedirect, router]);

  const { data: libraryQs = [] } = useQuery({
    queryKey: ['questionnaire-library'],
    queryFn: fetchLibraryQuestionnaires,
    enabled: page === 'questionnaire'
  });

  const libraryOptions = useMemo(
    () => libraryOptionsFromQuery(libraryQs),
    [libraryQs]
  );

  const handleSelectLibrary = useCallback(
    (ids: string[]) => {
      setSelectedIds(ids);
      for (const [index] of fields.entries()) {
        if (!lockedBatchIndices.includes(index)) {
          setValue(`batches.${index}.questionnaireIds`, ids);
        }
      }
    },
    [fields, lockedBatchIndices, setValue]
  );

  const handleCustomUpload = useCallback(
    (q: Questionnaire | null) => {
      if (!q?.id) return;
      handleSelectLibrary([...selectedIds, q.id]);
    },
    [handleSelectLibrary, selectedIds]
  );

  const onSubmitForm = (data: FormData) => {
    void submitEditStudy({
      study,
      planIds,
      lockedBatchIndices,
      planDefinitions,
      data,
      router
    });
  };

  // Don't render wrong page while redirecting
  const effectivePage = shouldRedirect ? 'title' : page;

  // Actions for the FAB
  const formActions = {
    canAdvance:
      effectivePage === 'title'
        ? Boolean(formValues.title)
        : selectedIds.length > 0,
    onAdvance: () => {
      if (effectivePage === 'title') {
        void trigger(['title', 'description']).then(valid => {
          if (valid) router.push('/research/edit?page=questionnaire');
          return valid;
        });
      } else if (effectivePage === 'questionnaire') {
        router.push('/research/edit?page=batch');
      }
    },
    onSubmit: () => void handleSubmit(onSubmitForm)()
  };

  return (
    <ResearchFormActionsProvider value={formActions}>
      {renderStep({
        effectivePage,
        register,
        errors,
        libraryOptions,
        selectedIds,
        handleSelectLibrary,
        handleCustomUpload,
        fields,
        formValues,
        setValue,
        append,
        remove,
        lockedBatchIndices
      })}
    </ResearchFormActionsProvider>
  );
}
