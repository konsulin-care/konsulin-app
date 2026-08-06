/* eslint-disable sonarjs/cognitive-complexity, max-lines, complexity, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import PageLoader from '@/components/general/page-loader';
import { SmartFormShell } from '@/components/general/smart-form-shell';
import ShareResearchCta from '@/components/research/share-research-cta';
import { Roles } from '@/constants/roles';
import { useFab } from '@/context/fabContext';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { useRequiredValidation } from '@/hooks/useRequiredValidation';
import { getAPI } from '@/services/api';
import { useSubmitQuestionnaire } from '@/services/api/assessment';
import { useResearchProgress } from '@/services/api/research';
import {
  nextAssessmentInStudy,
  resolveStudyIdForQuestionnaire
} from '@/utils/fhir/research';
import { BookCheck } from 'lucide-react';
import Image from 'next/image';

import { AssessmentThemeProvider } from '@/components/general/assessment-theme-provider';
import { CardStackContainer } from '@/components/general/card-stack-container';
import AppDrawer from '@/components/ui/app-drawer';
import { dbGet, dbSet, STORES } from '@/lib/indexeddb';
import type { RendererConfig } from '@aehrc/smart-forms-renderer';
import { getResponse, useBuildForm } from '@aehrc/smart-forms-renderer';
import { Questionnaire, QuestionnaireResponse } from 'fhir/r4';
import { useRouter } from 'next/navigation';
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

  /** Next questionnaire after submitting this one: the shortest current batch
   * that deploys it, or null when it is not part of any research batch. */
  const continuation = useMemo(
    () =>
      nextAssessmentInStudy(researchProgress?.studies ?? [], questionnaire.id),
    [researchProgress, questionnaire.id]
  );

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
        if (isAuthenticated) {
          const basePath = patientId
            ? `/record?id=${patientId}&view=QuestionnaireResponse/${responseId}`
            : `/record?view=QuestionnaireResponse/${responseId}`;
          router.replace(basePath);
        } else {
          router.replace(`/result?id=${responseId}`);
        }
        setIsSubmitting(false);
      } else {
        router.push(`/assessments?id=${continuation.nextQuestionnaireId}`);
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

      // Authenticated users only: trigger webhook AFTER QR is saved
      if (
        isAuthenticated &&
        interpretationItem?.item?.length &&
        submitResult?.id
      ) {
        const payload = {
          questionnaire: questionnaireResponse.questionnaire,
          description: questionnaire.description,
          item: interpretationItem.item
        };

        const API = await getAPI();
        const hookRes = await API.post('/api/v1/hook/interpret', payload);

        const serviceRequestId =
          hookRes?.data?.data?.asyncServiceResultId?.trim?.() ?? '';

        if (serviceRequestId) {
          dbSet(STORES.serviceRequests, {
            id: submitResult.id,
            ownerId: draftOwnerId,
            serviceRequestId,
            updatedAt: Date.now()
          }).catch((err: unknown) => console.warn('[IndexedDB]', err));
        }
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

  const drawerTitleText =
    formType === 'research' ? (
      <div className='mb-2 text-2xl font-bold'>
        Terima Kasih Karena Telah Berpatisipasi Dalam Research
      </div>
    ) : (
      <div className='mb-2 text-2xl font-bold'>
        Selamat Anda Menyelesaikan Test
      </div>
    );

  const drawerDescriptionText =
    formType === 'research' ? (
      <span className='text-sm opacity-50'>
        Partisipasi Anda sangat berharga bagi kami dan akan membantu kami dalam
        mengembangkan solusi yg lebih baik untuk kebutuhan Anda.
      </span>
    ) : (
      <span className='text-sm opacity-50'>
        Hasil test ini akan memberikan wawasan berharga tentang kesehatan mental
        Anda
      </span>
    );

  const ctaLabel = continuation?.nextQuestionnaireId
    ? 'Continue'
    : 'See Results';

  /** Submits and navigates to the next questionnaire, or the result page. */
  const handlePrimaryAction = () => {
    const destination = continuation?.nextQuestionnaireId
      ? 'continue'
      : 'result';
    handleSubmitQuestionnaire(destination).catch(console.error);
  };

  let footerContent: ReactNode = null;
  if (continuation?.nextQuestionnaireId) {
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
  } else if (continuation) {
    footerContent = (
      <p className='mt-2 text-center text-sm text-gray-500'>
        You've completed this batch
      </p>
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
        <div className='flex flex-col items-center gap-4'>
          <Image
            className='rounded-[8px] object-cover'
            src={'/images/submit-questionnaire.png'}
            height={0}
            width={200}
            style={{ width: '200', height: 'auto' }}
            alt='success'
          />
          {formType === 'research' && (
            <ShareResearchCta
              isPatient={isAuthenticated && Boolean(patientId)}
              fhirId={patientId}
              studyId={resolveStudyIdForQuestionnaire(
                researchProgress?.studies ?? [],
                questionnaire.id
              )}
            />
          )}
        </div>
      </AppDrawer>
    </AssessmentThemeProvider>
  );
}
export default FhirFormsRenderer;
