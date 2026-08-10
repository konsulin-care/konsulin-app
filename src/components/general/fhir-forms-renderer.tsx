/* eslint-disable sonarjs/cognitive-complexity, max-lines, complexity, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import PageLoader from '@/components/general/page-loader';
import { SmartFormShell } from '@/components/general/smart-form-shell';
import ShareResearchButton from '@/components/research/share-research-button';
import type { DrawerCopy } from '@/constants/research-copy';
import {
  fillProgress,
  FINAL_BATCH_MESSAGE,
  LAST_MID_BATCH_MESSAGE,
  MID_BATCH_FALLBACK_MESSAGE,
  MID_BATCH_MESSAGES,
  STANDALONE_MESSAGE,
  STANDALONE_RESEARCH_MESSAGE
} from '@/constants/research-copy';
import { Roles } from '@/constants/roles';
import { useFab } from '@/context/fabContext';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { useRequiredValidation } from '@/hooks/useRequiredValidation';
import { getAPI } from '@/services/api';
import { useSubmitQuestionnaire } from '@/services/api/assessment';
import { useResearchProgress } from '@/services/api/research';
import { nextAssessmentInStudy } from '@/utils/fhir/research';
import { BookCheck } from 'lucide-react';
import Image from 'next/image';

import { AssessmentThemeProvider } from '@/components/general/assessment-theme-provider';
import { CardStackContainer } from '@/components/general/card-stack-container';
import AppDrawer from '@/components/ui/app-drawer';
import { dbGet, dbSet, STORES } from '@/lib/indexeddb';
import type { RendererConfig } from '@aehrc/smart-forms-renderer';
import { getResponse, useBuildForm } from '@aehrc/smart-forms-renderer';
import {
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireResponseItem
} from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode
} from 'react';
import { toast } from 'react-toastify';

interface FhirFormsRendererProps {
  questionnaire: Questionnaire;
  isAuthenticated: boolean;
  patientId?: string;
  formType?: string;
  role?: string;
  practitionerId?: string;
  ownerId?: string; // for scoping IndexedDB drafts per user/guest
}

/**
 * Posts the interpretation item to the async interpret webhook and records
 * the returned service request id in IndexedDB for later result polling.
 * Fire-and-forget: failures are logged and never block form submission.
 *
 * @param opts - Response id, draft owner, and the interpret payload.
 */
async function triggerInterpretWebhook(opts: {
  responseId: string;
  ownerId: string;
  payload: {
    questionnaire?: string;
    description?: string;
    item: QuestionnaireResponseItem[];
  };
}): Promise<void> {
  try {
    const API = await getAPI();
    const hookRes = await API.post('/api/v1/hook/interpret', opts.payload);
    const serviceRequestId =
      hookRes?.data?.data?.asyncServiceResultId?.trim?.() ?? '';
    if (!serviceRequestId) return;
    await dbSet(STORES.serviceRequests, {
      id: opts.responseId,
      ownerId: opts.ownerId,
      serviceRequestId,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.error('[interpret] webhook failed', err);
  }
}

/**
 *
 */
function FhirFormsRenderer(props: FhirFormsRendererProps) {
  const {
    questionnaire,
    isAuthenticated,
    patientId,
    formType,
    role,
    practitionerId
  } = props;

  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState<QuestionnaireResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const studyId = searchParams.get('study');
  const isResearchFlow = Boolean(studyId);
  const doneIds = useMemo(
    () => (searchParams.get('done') ?? '').split(',').filter(Boolean),
    [searchParams]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { dispatch } = useFab();
  const draftOwnerId = props.ownerId || practitionerId || patientId || '';

  const rendererConfigOptions: RendererConfig = useMemo(
    () => ({
      itemResponsive: {
        labelBreakpoints: { xs: 12, md: 12 },
        fieldBreakpoints: { xs: 12, md: 12 },
        columnGapPixels: 24,
        rowGapPixels: 4
      }
    }),
    []
  );

  const isBuilding = useBuildForm({
    questionnaire,
    questionnaireResponse: response,
    rendererConfigOptions
  });

  const { mutateAsync: submitQuestionnaire } = useSubmitQuestionnaire(
    questionnaire.id,
    isAuthenticated
  );

  const { data: researchProgress } = useResearchProgress();

  /** Next questionnaire after submitting this one: the current batch of the
   * study the chain came from, or the shortest current batch that deploys it
   * when no study is in play. Null when it is not part of any research batch. */
  const continuation = useMemo(
    () =>
      nextAssessmentInStudy(
        researchProgress?.studies ?? [],
        questionnaire.id,
        isResearchFlow ? (studyId ?? undefined) : undefined,
        isResearchFlow ? doneIds : []
      ),
    [researchProgress, questionnaire.id, isResearchFlow, studyId, doneIds]
  );

  /** True when the batch has another questionnaire after the current one. */
  const hasNextQuestionnaire =
    isResearchFlow && Boolean(continuation?.nextQuestionnaireId);

  /** True when the current questionnaire finishes the current batch. */
  const isBatchComplete =
    isResearchFlow &&
    Boolean(continuation) &&
    !continuation?.nextQuestionnaireId;

  /** Title of the study the completed batch belongs to, for the share invite. */
  const studyTitle =
    researchProgress?.studies.find(
      item => item.study.id === continuation?.studyId
    )?.study.title ?? '';

  /**
   * Progress within the continuation study's current batch: server-known
   * completions, chain-done ids, and the current questionnaire unioned and
   * intersected with the batch ids. Null when the batch cannot be resolved.
   */
  const batchProgress = useMemo(() => {
    const study = researchProgress?.studies.find(
      item => item.study.id === continuation?.studyId
    );
    const batchIds = study?.currentBatch?.questionnaireIds ?? [];
    if (batchIds.length === 0) return null;
    const completedSet = new Set([
      ...(study?.completedQuestionnaireIds ?? []),
      ...doneIds,
      questionnaire.id
    ]);
    const completed = batchIds.filter(id => completedSet.has(id)).length;
    return { completed, total: batchIds.length };
  }, [researchProgress, continuation?.studyId, doneIds, questionnaire.id]);

  /**
   * Motivational copy for the mid-batch drawer: the dedicated last-one
   * message when a single questionnaire remains, otherwise a pick from the
   * pool seeded by the questionnaire id so each one shows a fresh variation
   * while staying stable across re-renders.
   */
  const midBatchMessage = useMemo(() => {
    if (batchProgress === null) return MID_BATCH_FALLBACK_MESSAGE;
    if (batchProgress.total - batchProgress.completed === 1) {
      return LAST_MID_BATCH_MESSAGE;
    }
    let seed = 0;
    for (const ch of questionnaire.id) {
      seed = (seed * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
    }
    return MID_BATCH_MESSAGES[seed % MID_BATCH_MESSAGES.length];
  }, [batchProgress, questionnaire.id]);

  /** Title/body for the submission drawer, keyed on the flow state. */
  const drawerCopy: DrawerCopy = (() => {
    if (hasNextQuestionnaire) {
      return {
        title: midBatchMessage.title,
        body: fillProgress(
          midBatchMessage.body,
          batchProgress?.completed ?? 0,
          batchProgress?.total ?? 0
        )
      };
    }
    if (isBatchComplete) return FINAL_BATCH_MESSAGE;
    return formType === 'research'
      ? STANDALONE_RESEARCH_MESSAGE
      : STANDALONE_MESSAGE;
  })();

  const { requiredItemEmpty, checkRequiredIsEmpty, invalidItems } =
    useRequiredValidation();

  useEffect(() => {
    dbGet<{ response: QuestionnaireResponse }>(STORES.assessmentDrafts, [
      draftOwnerId,
      questionnaire.id
    ])
      .then(saved => {
        if (saved?.response) {
          setResponse(saved.response);
        }
        return saved;
      })
      .catch((err: unknown) => console.warn('[IndexedDB]', err));
  }, [draftOwnerId, questionnaire.id]);

  const autoSave = useDraftAutoSave(STORES.assessmentDrafts, qr => ({
    ownerId: draftOwnerId,
    questionnaireId: questionnaire.id,
    response: qr,
    updatedAt: Date.now()
  }));

  /** Validates required fields before submission. */
  const handleValidation = useCallback(() => {
    if (Object.keys(invalidItems).length === 0) {
      setIsOpen(true);
    } else {
      checkRequiredIsEmpty();
    }
  }, [invalidItems, checkRequiredIsEmpty]);

  /** Navigates after form submission based on button label. */
  const handleNavigate = (buttonLabel: string, responseId?: string) => {
    startTransition(() => {
      if (buttonLabel === 'result' || !continuation?.nextQuestionnaireId) {
        // Final questionnaire of a batch: both roles land on the study report.
        if (isBatchComplete && continuation?.studyId) {
          router.replace(`/report?id=${continuation.studyId}`);
        } else if (isAuthenticated) {
          const basePath = patientId
            ? `/record?id=${patientId}&view=QuestionnaireResponse/${responseId}`
            : `/record?view=QuestionnaireResponse/${responseId}`;
          router.replace(basePath);
        } else {
          router.replace(`/result?id=${responseId}`);
        }
        setIsSubmitting(false);
      } else {
        const nextDone = [...doneIds, questionnaire.id];
        router.push(
          `/assessments?id=${continuation.nextQuestionnaireId}&study=${continuation.studyId}&done=${nextDone.join(',')}`
        );
        setIsSubmitting(false);
      }
    });
  };

  /** Submits the questionnaire response and triggers post-submit actions. */
  const handleSubmitQuestionnaire = async (buttonLabel: string) => {
    setIsSubmitting(true);

    const questionnaireResponse = getResponse();
    if (!questionnaireResponse) return;

    let author;
    let subject;

    if (isAuthenticated) {
      // Authenticated
      if (role === Roles.Practitioner) {
        if (!practitionerId || !patientId) {
          toast.error('Missing practitioner or patient information');
          setIsSubmitting(false);
          return;
        }
        author = { reference: `Practitioner/${practitionerId}` };
        subject = { reference: `Practitioner/${practitionerId}` };
      } else {
        if (!patientId) {
          toast.error('Missing patient information');
          setIsSubmitting(false);
          return;
        }
        author = { reference: `Patient/${patientId}` };
        subject = { reference: `Patient/${patientId}` };
      }
    } else {
      author = undefined;
      subject = undefined;
    }

    const interpretationItem = questionnaireResponse.item.find(
      item => item.linkId === 'interpretation'
    );

    try {
      const submitResult = await submitQuestionnaire({
        ...questionnaireResponse,
        author,
        subject
      });

      // Authenticated users only: fire-and-forget the interpret webhook so
      // navigation is never blocked on the async interpretation. The record
      // page polls the result via the stored service request id.
      if (
        isAuthenticated &&
        interpretationItem?.item?.length &&
        submitResult?.id
      ) {
        // skipcq: JS-0098 - fire-and-forget interpret webhook; record page polls the result
        void triggerInterpretWebhook({
          responseId: submitResult.id,
          ownerId: draftOwnerId,
          payload: {
            questionnaire: questionnaireResponse.questionnaire,
            description: questionnaire.description,
            item: interpretationItem.item
          }
        });
      }

      /* save questionnaire response to IndexedDB for guest */
      if (!isAuthenticated) {
        dbSet(STORES.assessmentDrafts, {
          ownerId: draftOwnerId,
          questionnaireId: questionnaire.id,
          response: { ...questionnaireResponse, id: submitResult.id },
          updatedAt: Date.now()
        }).catch((err: unknown) => console.warn('[IndexedDB]', err));
      }

      handleNavigate(buttonLabel, submitResult.id);
    } catch (error) {
      console.error('Error message :', error);
      toast.error('An error occurred while submitting the questionnaire');
      setIsSubmitting(false);
    }
  };

  const drawerTitleText = (
    <div className='mb-2 text-2xl font-bold'>{drawerCopy.title}</div>
  );

  const drawerDescriptionText = (
    <span className='text-sm opacity-50'>{drawerCopy.body}</span>
  );

  const ctaLabel =
    isResearchFlow && continuation?.nextQuestionnaireId
      ? 'Continue'
      : 'See Results';

  /** Submits and navigates to the next questionnaire, or the result page.
   * The destination mirrors the CTA label: only research flows continue. */
  const handlePrimaryAction = () => {
    const destination =
      isResearchFlow && continuation?.nextQuestionnaireId
        ? 'continue'
        : 'result';
    handleSubmitQuestionnaire(destination).catch(console.error);
  };

  let footerContent: ReactNode = null;
  if (hasNextQuestionnaire) {
    footerContent = (
      <button
        type='button'
        className='mt-2 w-full text-center text-sm text-gray-500 underline underline-offset-4'
        onClick={() => {
          handleSubmitQuestionnaire('result').catch(console.error);
        }}
      >
        See Results
      </button>
    );
  } else if (isBatchComplete) {
    footerContent = (
      <ShareResearchButton
        title={studyTitle}
        isPatient={isAuthenticated && Boolean(patientId)}
        fhirId={patientId}
        studyId={continuation?.studyId}
        className='mt-2 w-full text-center text-sm text-gray-500 underline underline-offset-4'
      />
    );
  }

  // Sync FAB action state when user has interacted with the form
  useEffect(() => {
    if (hasInteracted) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Submit',
          icon: BookCheck,
          onAction: handleValidation,
          isSaving: isSubmitting,
          disabled:
            requiredItemEmpty > 0 ||
            (role === Roles.Practitioner && !patientId),
          variant: 'primary'
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }
  }, [
    hasInteracted,
    requiredItemEmpty,
    role,
    patientId,
    isSubmitting,
    handleValidation,
    dispatch
  ]);

  // Clean up action state on unmount
  useEffect(() => {
    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [dispatch]);

  if (isBuilding) {
    return <PageLoader />;
  }

  return (
    <AssessmentThemeProvider>
      <CardStackContainer>
        <SmartFormShell
          className='custom-smart-form'
          onChange={() => {
            autoSave();
            if (!hasInteracted) setHasInteracted(true);
          }}
        />
      </CardStackContainer>

      <AppDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={drawerTitleText}
        description={drawerDescriptionText}
        ctaLabel={ctaLabel}
        onCtaClick={handlePrimaryAction}
        ctaLoading={isSubmitting || isPending}
        footerContent={footerContent}
      >
        {!hasNextQuestionnaire && (
          <div className='flex flex-col items-center gap-4'>
            <Image
              className='rounded-[8px] object-cover'
              src={'/images/submit-questionnaire.png'}
              height={0}
              width={200}
              style={{ width: '200', height: 'auto' }}
              alt='success'
            />
          </div>
        )}
      </AppDrawer>
    </AssessmentThemeProvider>
  );
}
export default FhirFormsRenderer;
