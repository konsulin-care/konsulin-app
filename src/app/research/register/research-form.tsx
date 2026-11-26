'use client';

import QuestionnaireUploadDrawer from '@/components/shared/questionnaire-upload-drawer';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { getAPI } from '@/services/api';
import { useOrganizationName } from '@/services/api/organization';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { Questionnaire } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
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
import { RenderStep } from '../shared-components';
import { studyMetadataShape } from '../study-metadata-schema';
import { TitleStepMetadataProvider } from './research-form-steps';
import { submitStudy } from './submit-study';

/** Study fields shared with the edit form. */
const baseSchema = z.object({
  title: z.string().min(1, 'title_required'),
  description: z.string().optional(),
  targetParticipants: z
    .number({ message: 'target_required' })
    .int('target_required')
    .positive('target_required')
    .optional()
    .refine(v => v !== undefined, 'target_required'),
  batches: z
    .array(
      z.object({
        startDate: z.string().min(1, 'start_date_required'),
        endDate: z.string().min(1, 'end_date_required'),
        questionnaireIds: z.array(z.string()).min(1, 'questionnaire_required')
      })
    )
    .min(1, 'batch_required')
});

/**
 * Register schema: the shared study fields plus the study metadata step.
 * Metadata keys stay optional in the exported schema so the shared edit form
 * keeps typechecking until it adopts the new step; the register resolver uses
 * the strict schema where those keys are required.
 */
export const schema = baseSchema.extend(studyMetadataShape.partial().shape);

const registerSchema = baseSchema.extend(studyMetadataShape.shape);

/** Form values of the register form. */
export type FormData = z.infer<typeof schema>;

type Page = 'title' | 'questionnaire' | 'batch';

const VALID_PAGES = new Set<Page>(['title', 'questionnaire', 'batch']);

/** Resolve a raw page query value to a known page, defaulting to title. */
const parsePage = (raw: string | null): Page =>
  VALID_PAGES.has(raw as Page) ? (raw as Page) : 'title';

/** Hydrate partial form data from localStorage. */
const loadFromStorage = (key: string): Partial<FormData> | null => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as Partial<FormData>;
  } catch {
    /* corrupt data */
  }
  return null;
};

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  targetParticipants: undefined,
  researchQuestion: '',
  whoCanJoin: '',
  ethicsStatus: 'applying',
  ethicsReference: '',
  sharesFindings: false,
  batches: [{ startDate: '', endDate: '', questionnaireIds: [] }]
};

/** Default values for the register form, hydrated from the stored draft. */
function defaultValuesFrom(stored: Partial<FormData> | null): FormData {
  return { ...EMPTY_FORM, ...stored };
}

/** Keep the page query canonical and guard deep links with too little data. */
function usePageGuards(
  rawPage: string | null,
  title: string | undefined,
  router: ReturnType<typeof useRouter>
) {
  const page = parsePage(rawPage);
  const needsCanonicalize =
    rawPage === null || !VALID_PAGES.has(rawPage as Page);
  const shouldRedirect = page !== 'title' && !title;
  useEffect(() => {
    if (needsCanonicalize) router.replace('/research/register?page=title');
  }, [needsCanonicalize, router]);
  useEffect(() => {
    if (shouldRedirect) router.replace('/research/register?page=title');
  }, [shouldRedirect, router]);
  return { page, effectivePage: shouldRedirect ? 'title' : page };
}

/** Persist the draft to localStorage after the first render. */
function useDraftPersistence(storageKey: string, values: FormData, page: Page) {
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return () => {
        /* noop: skip first render */
      };
    }
    const id = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({ ...values, page }));
    }, 500);
    return () => {
      clearTimeout(id);
    };
  }, [values, page, storageKey]);
}

/**
 * Register a new research study.
 * @returns the multi-step register form
 */
export default function ResearchForm() {
  const tToast = useTranslations('toast');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state: authState } = useAuth();
  const userId = authState?.userInfo?.fhirId;
  const organizationId = authState?.userInfo?.organizationId;
  const leadName = authState?.userInfo?.fullname;
  const { data: organizationName = '' } = useOrganizationName(organizationId);
  const storageKey = `research-form-${userId ?? 'anonymous'}`;
  const storedData = useRef(loadFromStorage(storageKey));
  const [customQuestionnaires, setCustomQuestionnaires] = useState<
    QuestionnaireOption[]
  >([]);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);

  const form = useForm<FormData>({
    // @type the strict schema validates metadata keys that FormData keeps optional
    resolver: zodResolver(registerSchema) as unknown as Resolver<FormData>,
    defaultValues: defaultValuesFrom(storedData.current)
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

  const { page, effectivePage } = usePageGuards(
    searchParams.get('page'),
    formValues.title,
    router
  );
  useDraftPersistence(storageKey, formValues, page);

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
    formValues.batches.flatMap(b => b.questionnaireIds)
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

  const onSubmitForm = useCallback(
    async (data: FormData) => {
      try {
        const API = await getAPI();
        await submitStudy(API, {
          data,
          userId,
          storageKey,
          router,
          tToast,
          organizationId,
          organizationName,
          leadName
        });
      } catch {
        toast.error(tToast('research_create_failed'));
      }
    },
    [
      userId,
      storageKey,
      router,
      tToast,
      organizationId,
      organizationName,
      leadName
    ]
  );

  // Actions for the FAB (memoized to prevent infinite re-render in bridge)
  const formActions = useMemo(
    () => ({
      canAdvance:
        effectivePage === 'title'
          ? canAdvanceOnTitlePage({
              title: formValues.title,
              description: formValues.description,
              target: formValues.targetParticipants,
              question: formValues.researchQuestion,
              ethicsStatus: formValues.ethicsStatus
            })
          : selectedIds.length > 0,
      onAdvance: async () => {
        if (effectivePage === 'title') {
          const valid = await trigger(['title', 'description']);
          if (valid) {
            router.push('/research/register?page=questionnaire');
          }
        } else if (effectivePage === 'questionnaire') {
          router.push('/research/register?page=batch');
        }
      },
      onSubmit: () => {
        void handleSubmit(onSubmitForm)();
      }
    }),
    [
      effectivePage,
      formValues.title,
      formValues.description,
      formValues.targetParticipants,
      formValues.researchQuestion,
      formValues.ethicsStatus,
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
      <TitleStepMetadataProvider
        value={{ groupName: organizationName, control }}
      >
        {RenderStep({
          effectivePage,
          title: 'Register New Research',
          register,
          errors,
          libraryOptions,
          availableQuestionnaires: allQuestionnaireOptions.filter(q =>
            selectedIds.includes(q.code)
          ),
          selectedIds,
          handleSelectLibrary,
          handleOpenUploadDrawer: () => setIsUploadDrawerOpen(true),
          fields,
          batches: formValues.batches,
          setValue,
          append,
          remove
        })}
      </TitleStepMetadataProvider>
      <QuestionnaireUploadDrawer
        open={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        onUploaded={handleUploaded}
        showFee={false}
        showImage={false}
        context='research'
        resolvePublisher={() => authState?.userInfo?.fullname ?? 'Researcher'}
      />
    </ResearchFormActionsProvider>
  );
}

export { submitStudy } from './submit-study';
