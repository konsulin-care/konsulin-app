'use client';

import QuestionnaireUploadDrawer from '@/components/shared/questionnaire-upload-drawer';
import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { Questionnaire } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { canAdvanceOnTitlePage } from '../can-advance';
import { ResearchFormActionsProvider } from '../research-form-actions-context';
import { ResearchFormFabBridge } from '../research-form-fab-bridge';
import {
  fetchLibraryQuestionnaires,
  libraryOptionsFromQuery,
  type QuestionnaireOption
} from '../shared';
import { RenderStep } from './render-step';

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
  const [customQuestionnaires, setCustomQuestionnaires] = useState<
    QuestionnaireOption[]
  >([]);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const isInitialMount = useRef(true);

  // Derive page from URL params with guard
  const rawPage = searchParams.get('page');
  const page: Page = VALID_PAGES.has(rawPage as Page)
    ? (rawPage as Page)
    : 'title';

  // Canonicalize: redirect to ?page=title when missing or invalid
  const needsCanonicalize = !rawPage || !VALID_PAGES.has(rawPage as Page);
  useEffect(() => {
    if (needsCanonicalize) {
      router.replace('/research/register?page=title');
    }
  }, [needsCanonicalize, router]);

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
    queryFn: fetchLibraryQuestionnaires
  });

  const libraryOptions = useMemo(
    () => libraryOptionsFromQuery(libraryQs),
    [libraryQs]
  );

  // Merge library and custom questionnaires for batch step
  const allQuestionnaireOptions = useMemo(
    () => [...libraryOptions, ...customQuestionnaires],
    [libraryOptions, customQuestionnaires]
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

  const handleUploaded = useCallback(
    (q: Questionnaire) => {
      const option: QuestionnaireOption = {
        code: q.id ?? '',
        name: q.title ?? q.id ?? '',
        duration: null,
        category: null
      };
      setCustomQuestionnaires(prev => [...prev, option]);
      handleSelectLibrary([...selectedIds, q.id ?? '']);
    },
    [handleSelectLibrary, selectedIds]
  );

  const handleOpenUploadDrawer = useCallback(
    () => setIsUploadDrawerOpen(true),
    []
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
      {RenderStep({
        effectivePage,
        register,
        errors,
        libraryOptions,
        availableQuestionnaires: allQuestionnaireOptions,
        selectedIds,
        handleSelectLibrary,
        handleOpenUploadDrawer,
        fields,
        formValues,
        setValue,
        append,
        remove
      })}
      <QuestionnaireUploadDrawer
        open={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        onUploaded={handleUploaded}
        showFee={false}
        showImage={false}
        context='research'
        resolvePublisher={() => {
          const user = authState?.userInfo;
          return user?.fullname ?? 'Researcher';
        }}
      />
    </ResearchFormActionsProvider>
  );
}
