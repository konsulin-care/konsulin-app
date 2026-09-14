'use client';

import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { Bundle, Questionnaire } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { canAdvanceOnTitlePage } from '../can-advance';
import { ResearchFormActionsProvider } from '../research-form-actions-context';
import { ResearchFormFabBridge } from '../research-form-fab-bridge';
import { Step1, Step2, Step3 } from './research-form-steps';

export const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  batches: z
    .array(
      z.object({
        startDate: z.string().min(1, 'Start date required'),
        endDate: z.string().min(1, 'End date required'),
        questionnaireIds: z
          .array(z.string())
          .min(1, 'Select at least one questionnaire')
      })
    )
    .min(1, 'At least one batch required')
});

export type FormData = z.infer<typeof schema>;

type Page = 'title' | 'questionnaire' | 'batch';

const VALID_PAGES = new Set<Page>(['title', 'questionnaire', 'batch']);

const getStorageKey = (userId: string | undefined) =>
  `research-form-${userId ?? 'anonymous'}`;

const loadFromStorage = (
  key: string
): (Partial<FormData> & { page?: string }) | null => {
  try {
    const stored = localStorage.getItem(key);
    if (stored)
      return JSON.parse(stored) as Partial<FormData> & { page?: string };
  } catch {
    /* corrupt data */
  }
  return null;
};

const createBatch = (date = ''): FormData['batches'][number] => ({
  startDate: date,
  endDate: date,
  questionnaireIds: []
});
const submitStudy = async (
  API: Awaited<ReturnType<typeof getAPI>>,
  data: FormData,
  userId: string | undefined,
  storageKey: string,
  router: ReturnType<typeof useRouter>
) => {
  const planIds: string[] = [];
  for (const batch of data.batches) {
    const res: { data: { id?: string } } = await API.post(
      '/fhir/PlanDefinition',
      {
        resourceType: 'PlanDefinition',
        title: `Batch ${planIds.length + 1}`,
        status: 'active',
        effectivePeriod: { start: batch.startDate, end: batch.endDate },
        action: batch.questionnaireIds.map(qId => ({
          definitionCanonical: `Questionnaire/${qId}`
        }))
      }
    );
    if (res.data.id) planIds.push(res.data.id);
  }

  const starts = data.batches
    .map(b => b.startDate)
    .toSorted((a, b) => a.localeCompare(b));
  const ends = data.batches
    .map(b => b.endDate)
    .toSorted((a, b) => a.localeCompare(b));

  await API.post('/fhir/ResearchStudy', {
    resourceType: 'ResearchStudy',
    title: data.title,
    description: data.description,
    status: 'active',
    principalInvestigator: { reference: `Practitioner/${userId}` },
    protocol: planIds.map(id => ({ reference: `PlanDefinition/${id}` })),
    period: { start: starts[0], end: ends.at(-1) }
  });

  localStorage.removeItem(storageKey);
  toast.success('Research study created successfully');
  router.push('/');
};
/** Fetches questionnaire library from FHIR API. */
async function fetchLibraryQuestionnaires() {
  const API = await getAPI();
  const res = await API.get<Bundle>(
    '/fhir/Questionnaire?context=popular,regular&status=active&_elements=id,title,description,extension'
  );
  return (res.data.entry ?? []).map(e => e.resource as Questionnaire);
}

/** Renders the appropriate step based on effective page. */
interface StepProps {
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
}

function renderStep(props: StepProps) {
  const {
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
    remove
  } = props;
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
          onCustomUpload={handleCustomUpload}
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
          availableQuestionnaires={libraryOptions}
          selectedQuestionnaireIds={selectedIds}
        />
      )}
    </div>
  );
}

/**
 *
 */
export default function ResearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: authState } = useAuth();
  const userId = authState?.userInfo?.fhirId;
  const storageKey = getStorageKey(userId);
  const storedData = useRef(loadFromStorage(storageKey));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [, setCustomQs] = useState<Questionnaire[]>([]);
  const isInitialMount = useRef(true);

  // Derive page from URL params with guard
  const rawPage = searchParams.get('page');
  const page: Page = VALID_PAGES.has(rawPage as Page)
    ? (rawPage as Page)
    : 'title';

  // Canonicalize: add ?page=title when missing
  useEffect(() => {
    if (!rawPage) {
      router.replace('/research/register?page=title');
    }
  }, [rawPage, router]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: storedData.current?.title ?? '',
      description: storedData.current?.description ?? '',
      batches: storedData.current?.batches ?? [createBatch()]
    }
  });

  const {
    register,
    control,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors }
  } = form;
  // eslint-disable-next-line react-hooks/incompatible-library
  const formValues = watch();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'batches'
  });

  // Deep link guard: if page is ahead of valid data, redirect to title
  const shouldRedirect = page !== 'title' && !formValues.title;
  useEffect(() => {
    if (shouldRedirect) router.replace('/research/register?page=title');
  }, [shouldRedirect, router]);

  // Persist to localStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return () => {
        /* noop: skip first render */
      };
    }
    const id = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({ ...formValues, page }));
    }, 500);
    return () => clearTimeout(id);
  }, [formValues, page, storageKey]);

  const { data: libraryQs = [] } = useQuery({
    queryKey: ['questionnaire-library'],
    queryFn: fetchLibraryQuestionnaires,
    enabled: page === 'questionnaire'
  });

  const libraryOptions = useMemo(
    () =>
      libraryQs.map(q => ({ code: q.id ?? '', name: q.title ?? q.id ?? '' })),
    [libraryQs]
  );

  const handleSelectLibrary = useCallback(
    (ids: string[]) => {
      setSelectedIds(ids);
      for (const [index] of fields.entries()) {
        setValue(`batches.${index}.questionnaireIds`, ids);
      }
    },
    [fields, setValue]
  );

  const handleCustomUpload = useCallback(
    (q: Questionnaire | null) => {
      if (!q?.id) return;
      setCustomQs(prev => [...prev, q]);
      handleSelectLibrary([...selectedIds, q.id]);
    },
    [handleSelectLibrary, selectedIds]
  );

  // Don't render wrong page while redirecting
  const effectivePage = shouldRedirect ? 'title' : page;

  const onSubmitForm = useCallback(
    async (data: FormData) => {
      try {
        const API = await getAPI();
        await submitStudy(API, data, userId, storageKey, router);
      } catch {
        toast.error('Failed to create research study. Please try again.');
      }
    },
    [userId, storageKey, router]
  );

  // Actions for the FAB (memoized to prevent infinite re-render in bridge)
  const formActions = useMemo(
    () => ({
      canAdvance:
        effectivePage === 'title'
          ? canAdvanceOnTitlePage(formValues.title, formValues.description)
          : selectedIds.length > 0,
      onAdvance: () => {
        if (effectivePage === 'title') {
          void trigger(['title', 'description']).then(valid => {
            if (valid) router.push('/research/register?page=questionnaire');
            return valid;
          });
        } else if (effectivePage === 'questionnaire') {
          router.push('/research/register?page=batch');
        }
      },
      onSubmit: () => void handleSubmit(onSubmitForm)()
    }),
    [
      effectivePage,
      formValues.title,
      formValues.description,
      selectedIds.length,
      trigger,
      router,
      handleSubmit,
      onSubmitForm
    ]
  );

  return (
    <ResearchFormActionsProvider value={formActions}>
      <ResearchFormFabBridge />
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
        remove
      })}
    </ResearchFormActionsProvider>
  );
}
