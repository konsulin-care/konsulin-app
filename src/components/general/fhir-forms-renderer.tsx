/* eslint-disable sonarjs/cognitive-complexity, react/jsx-max-depth, max-lines, complexity, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import PageLoader from '@/components/general/page-loader';
import { SmartFormShell } from '@/components/general/smart-form-shell';
import { LoadingSpinnerIcon } from '@/components/icons';
import ShareResearchCta from '@/components/research/share-research-cta';
import { Button } from '@/components/ui/button';
import { Roles } from '@/constants/roles';
import { useFab } from '@/context/fabContext';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { useRequiredValidation } from '@/hooks/useRequiredValidation';
import { getAPI } from '@/services/api';
import { useSubmitQuestionnaire } from '@/services/api/assessment';
import { BookCheck } from 'lucide-react';
import Image from 'next/image';

import { AssessmentThemeProvider } from '@/components/general/assessment-theme-provider';
import { CardStackContainer } from '@/components/general/card-stack-container';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
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
  useTransition
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
      if (buttonLabel === 'result') {
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
        router.push('/assessments');
      }
    });
  };

  /** Submits the questionnaire response and triggers post-submit actions. */
  const handleSubmitQuestionnaire = async (buttonLabel: string) => {
    if (buttonLabel === 'close') {
      handleNavigate(buttonLabel);
      return;
    }

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

      /* save questionnaire response to IndexedDB for guest (if not closing) */
      if (buttonLabel !== 'close' && !isAuthenticated) {
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

  const drawerButtons = (
    <DrawerFooter className='mt-2 flex flex-col gap-4 text-gray-600'>
      {formType === 'research' && (
        <ShareResearchCta
          isPatient={isAuthenticated && Boolean(patientId)}
          fhirId={patientId}
        />
      )}
      {formType !== 'research' && (
        <Button
          className='bg-secondary h-full w-full rounded-xl p-4 text-white'
          onClick={() => {
            handleSubmitQuestionnaire('result').catch(console.error);
          }}
          disabled={isSubmitting || isPending}
        >
          {isSubmitting || isPending ? (
            <LoadingSpinnerIcon
              width={20}
              height={20}
              stroke='white'
              className='w-full animate-spin'
            />
          ) : (
            'See result'
          )}
        </Button>
      )}
      <Button
        className={`focus:ring-opacity-50 h-full w-full rounded-xl border border-solid p-4 transition-all focus:ring-2 focus:ring-gray-300 focus:outline-none ${
          formType === 'research'
            ? 'hover:bg-secondary/90 bg-secondary border-transparent text-white'
            : 'border-secondary text-secondary bg-transparent hover:bg-gray-100'
        }`}
        onClick={() => {
          handleSubmitQuestionnaire('close').catch(console.error);
        }}
      >
        Close
      </Button>
    </DrawerFooter>
  );

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

  const renderDrawerContent = (
    <>
      <DrawerHeader className='mx-auto flex flex-col items-center gap-4 pb-0 text-[20px]'>
        <Image
          className='rounded-[8px] object-cover'
          src={'/images/submit-questionnaire.png'}
          height={0}
          width={200}
          style={{ width: '200', height: 'auto' }}
          alt='success'
        />
        <DrawerTitle className='text-center'>{drawerTitleText}</DrawerTitle>
      </DrawerHeader>

      <DrawerDescription className='text-center'>
        {drawerDescriptionText}
      </DrawerDescription>

      {drawerButtons}
    </>
  );

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

      <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          {renderDrawerContent}
        </DrawerContent>
      </Drawer>
    </AssessmentThemeProvider>
  );
}
export default FhirFormsRenderer;
