'use client';

import QuestionnaireUploadDrawer from '@/components/shared/questionnaire-upload-drawer';
import { useAuth } from '@/context/auth/authContext';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlanDefinition, Questionnaire, ResearchStudy } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { canAdvanceOnTitlePage } from '../can-advance';
import { schema } from '../register/research-form';
import { ResearchFormActionsProvider } from '../research-form-actions-context';
import { ResearchFormFabBridge } from '../research-form-fab-bridge';
import {
  fetchLibraryQuestionnaires,
  libraryOptionsFromQuery,
  type QuestionnaireOption
} from '../shared';
import { buildEditUrl } from './build-edit-url';
import { RenderStep } from './render-step';
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
  const { state: authState } = useAuth();
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

  // Canonicalize: redirect to ?page=title when missing or invalid, preserving id
  const needsCanonicalize = !rawPage || !VALID_PAGES.has(rawPage as Page);
  useEffect(() => {
    if (needsCanonicalize) {
      router.replace(buildEditUrl(searchParams, 'title'));
    }
  }, [needsCanonicalize, router, searchParams]);

  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);

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
    getValues,
    formState: { errors }
  } = form;
  const { fields, append, remove } = useFieldArray<FormData>({
    control,
    name: 'batches'
  });

  const title = useWatch({ control, name: 'title' });
  const description = useWatch({ control, name: 'description' });
  const batches = useWatch({ control, name: 'batches' });

  // Deep link guard
  const shouldRedirect = page !== 'title' && !title;
  useEffect(() => {
    if (shouldRedirect) router.replace(buildEditUrl(searchParams, 'title'));
  }, [shouldRedirect, router, searchParams]);

  const [customQuestionnaires, setCustomQuestionnaires] = useState<
    QuestionnaireOption[]
  >([]);

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

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    getValues('batches').flatMap(b => b.questionnaireIds)
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

  const queryClient = useQueryClient();

  const onSubmitForm = useCallback(
    (data: FormData) => {
      void submitEditStudy({
        study,
        planIds,
        lockedBatchIndices,
        planDefinitions,
        data,
        router,
        queryClient
      });
    },
    [study, planIds, lockedBatchIndices, planDefinitions, router, queryClient]
  );

  const handleOpenUploadDrawer = useCallback(
    () => setIsUploadDrawerOpen(true),
    []
  );

  // Don't render wrong page while redirecting
  const effectivePage = shouldRedirect ? 'title' : page;

  // Actions for the FAB (memoized to prevent infinite re-render in bridge)
  const formActions = useMemo(
    () => ({
      canAdvance:
        effectivePage === 'title'
          ? canAdvanceOnTitlePage(title, description)
          : selectedIds.length > 0,
      onAdvance: () => {
        if (effectivePage === 'title') {
          void trigger(['title', 'description']).then(valid => {
            if (valid) router.push(buildEditUrl(searchParams, 'questionnaire'));
            return valid;
          });
        } else if (effectivePage === 'questionnaire') {
          router.push(buildEditUrl(searchParams, 'batch'));
        }
      },
      onSubmit: () => void handleSubmit(onSubmitForm)()
    }),
    [
      effectivePage,
      title,
      description,
      selectedIds.length,
      trigger,
      router,
      searchParams,
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
        availableQuestionnaires: allQuestionnaireOptions.filter(q =>
          selectedIds.includes(q.code)
        ),
        selectedIds,
        handleSelectLibrary,
        handleOpenUploadDrawer,
        fields,
        batches,
        setValue,
        append,
        remove,
        lockedBatchIndices
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
