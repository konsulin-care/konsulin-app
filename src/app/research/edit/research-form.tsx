'use client';

import QuestionnaireUploadDrawer from '@/components/shared/questionnaire-upload-drawer';
import { useAuth } from '@/context/auth/authContext';
import { useOrganizationName } from '@/services/api/organization';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlanDefinition, Questionnaire, ResearchStudy } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Resolver
} from 'react-hook-form';
import { canAdvanceOnTitlePage } from '../can-advance';
import { TitleStepMetadataProvider } from '../register/research-form-steps';
import { ResearchFormActionsProvider } from '../research-form-actions-context';
import { ResearchFormFabBridge } from '../research-form-fab-bridge';
import {
  fetchLibraryQuestionnaires,
  libraryOptionsFromQuery,
  type QuestionnaireOption
} from '../shared';
import { RenderStep } from '../shared-components';
import StudyFormPreview from '../study-form-preview';
import { buildEditUrl } from './build-edit-url';
import {
  computeLockedBatchIndices,
  editSchema,
  mapToFormData,
  mapToPlanIds,
  type FormData
} from './form-defaults';
import { submitEditStudy } from './submit-helpers';

type Page = 'title' | 'questionnaire' | 'batch';

const VALID_PAGES = new Set<Page>(['title', 'questionnaire', 'batch']);

/**
 * Map questionnaire options to the preview duration lookup.
 * @param options - questionnaire options with their optional durations
 * @returns minutes by questionnaire id
 */
function durationsFrom(
  options: QuestionnaireOption[]
): Record<string, number | undefined> {
  return Object.fromEntries(
    options.map((option): [string, number | undefined] => [
      option.code,
      option.duration ?? undefined
    ])
  );
}

interface EditResearchFormProps {
  study: ResearchStudy;
  planDefinitions: PlanDefinition[];
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
  const { state: authState } = useAuth();
  const organizationId = authState?.userInfo?.organizationId;
  const { data: organizationName = '' } = useOrganizationName(organizationId);
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
  const needsCanonicalize = rawPage !== page;
  useEffect(() => {
    if (needsCanonicalize) {
      router.replace(buildEditUrl(searchParams, 'title'));
    }
  }, [needsCanonicalize, router, searchParams]);

  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);

  const form = useForm<FormData>({
    // @type the strict edit schema validates metadata keys FormData keeps optional
    resolver: zodResolver(editSchema) as unknown as Resolver<FormData>,
    defaultValues: initialData
  });

  const {
    register,
    control,
    watch,
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
  const targetParticipants = useWatch({
    control,
    name: 'targetParticipants'
  });
  const researchQuestion = useWatch({ control, name: 'researchQuestion' });
  const ethicsStatus = useWatch({ control, name: 'ethicsStatus' });
  const [whoCanJoin, ethicsReference, sharesFindings] = useWatch({
    control,
    name: ['whoCanJoin', 'ethicsReference', 'sharesFindings']
  });
  // Read batches from the form values like the register form does. A separate
  // useWatch subscription can lag behind the field array and hand Step3 an
  // undefined row.
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedBatches = watch('batches');
  // Keep the batches handed to the steps and the preview aligned with the
  // field-array rows. A watched entry that lags behind falls back to its row,
  // so it can never surface an undefined index.
  const batches = useMemo(
    () => fields.map((field, index) => watchedBatches[index] ?? field),
    [fields, watchedBatches]
  );

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

  const previewDurations = useMemo(
    () => durationsFrom(allQuestionnaireOptions),
    [allQuestionnaireOptions]
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

  const handleOpenUploadDrawer = useCallback(() => {
    setIsUploadDrawerOpen(true);
  }, []);

  // Don't render wrong page while redirecting
  const effectivePage = shouldRedirect ? 'title' : page;

  // Actions for the FAB (memoized to prevent infinite re-render in bridge)
  const formActions = useMemo(
    () => ({
      canAdvance:
        effectivePage === 'title'
          ? canAdvanceOnTitlePage({
              title,
              description,
              target: targetParticipants,
              question: researchQuestion,
              ethicsStatus
            })
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
      targetParticipants,
      researchQuestion,
      ethicsStatus,
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
      <TitleStepMetadataProvider
        value={{ groupName: organizationName, control }}
      >
        <div className='grid gap-6 lg:grid-cols-2 lg:items-start'>
          {RenderStep({
            effectivePage,
            title: 'Edit Research',
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
          <StudyFormPreview
            title={title ?? ''}
            question={researchQuestion ?? ''}
            description={description}
            group={organizationName}
            lead={authState?.userInfo?.fullname ?? ''}
            whoCanJoin={whoCanJoin}
            ethicsStatus={ethicsStatus ?? 'applying'}
            ethicsReference={ethicsReference}
            sharesFindings={sharesFindings ?? false}
            batches={batches}
            durations={previewDurations}
          />
        </div>
      </TitleStepMetadataProvider>
      <QuestionnaireUploadDrawer
        open={isUploadDrawerOpen}
        onClose={() => {
          setIsUploadDrawerOpen(false);
        }}
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

export { type FormData } from './form-defaults';
