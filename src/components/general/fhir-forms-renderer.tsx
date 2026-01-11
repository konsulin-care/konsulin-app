import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Roles } from '@/constants/roles';
import { getAPI } from '@/services/api';
import { useSubmitQuestionnaire } from '@/services/api/assessment';
import Image from 'next/image';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { getFromLocalStorage } from '@/lib/utils';
import {
  BaseRenderer,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
  useQuestionnaireResponseStore,
  useRendererQueryClient
} from '@aehrc/smart-forms-renderer';
import { QueryClientProvider } from '@tanstack/react-query';
import { Questionnaire, QuestionnaireResponse } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';

interface FhirFormsRendererProps {
  questionnaire: Questionnaire;
  isAuthenticated: Boolean;
  patientId?: string;
  formType?: string;
  role?: string;
  practitionerId?: string;
}

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
  const [requiredItemEmpty, setRequiredItemEmpty] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useRendererQueryClient();
  const isBuilding = useBuildForm(questionnaire, response);

  const {
    mutateAsync: submitQuestionnaire,
    isLoading: submitQuestionnaireIsLoading
  } = useSubmitQuestionnaire(questionnaire.id, isAuthenticated);

  const invalidItems = useQuestionnaireResponseStore.use.invalidItems();

  useEffect(() => {
    const savedResponses = getFromLocalStorage(`response_${questionnaire.id}`);
    if (savedResponses) {
      setResponse(JSON.parse(savedResponses));
    }
  }, []);

  // add some delay to fetch the latest response after input settles
  const handleResponseChange = () => {
    setTimeout(() => {
      const questionnaireResponse = getResponse();
      localStorage.setItem(
        `response_${questionnaire.id}`,
        JSON.stringify(questionnaireResponse)
      );
    }, 300);
  };

  const checkRequiredIsEmpty = () => {
    const required = Object.values(invalidItems).flatMap(item =>
      item.issue
        .filter(issue => issue.code === 'required')
        .map(issue => ({
          expression: issue.expression[0],
          message: issue.details.text
        }))
    );
    setRequiredItemEmpty(required.length);
  };

  const handleValidation = () => {
    if (Object.keys(invalidItems).length !== 0) {
      checkRequiredIsEmpty();
    } else {
      setIsOpen(true);
    }
  };

  const handleNavigate = (buttonLabel: string, responseId?: string) => {
    startTransition(() => {
      if (buttonLabel === 'result') {
        const query = new URLSearchParams({
          category: '1',
          title: questionnaire.title
        }).toString();

        router.push(`/record/${responseId}?${query}`);
        setIsSubmitting(false);
      } else {
        router.push('/assessments');
      }
    });
  };

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

    // Guest
    if (!isAuthenticated) {
      author = undefined;
      subject = undefined;
    } else {
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
    }

    /* Check if the questionnaire response contains an item with linkId = 'interpretation'.
     * If it does, extract the item and send it to the webhook. */
    const interpretationItem = questionnaireResponse.item.find(
      item => item.linkId === 'interpretation'
    );

    try {
      if (!interpretationItem) {
        const result = await submitQuestionnaire({
          ...questionnaireResponse,
          author,
          subject
        });

        handleNavigate(buttonLabel, result.id);
        return;
      }

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
          localStorage.setItem(
            `serviceRequest_${submitResult.id}`,
            serviceRequestId
          );
        }
      }

      /* save questionnaire response to localStorage for guest (if not closing) */
      if (buttonLabel !== 'close' && !isAuthenticated) {
        localStorage.setItem(
          `response_${questionnaire.id}`,
          JSON.stringify({ ...questionnaireResponse, id: submitResult.id })
        );
      }

      handleNavigate(buttonLabel, submitResult.id);
    } catch (error) {
      console.log('Error message :', error);
      toast.error('An error occurred while submitting the questionnaire');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (Object.keys(invalidItems).length === 0) setRequiredItemEmpty(0);
    if (requiredItemEmpty > 0) checkRequiredIsEmpty();
  }, [invalidItems]);

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
        <DrawerTitle className='text-center'>
          {formType === 'research' ? (
            <div className='mb-2 text-2xl font-bold'>
              Terima Kasih Karena Telah Berpatisipasi Dalam Research
            </div>
          ) : (
            <div className='mb-2 text-2xl font-bold'>
              Selamat Anda Menyelesaikan Test
            </div>
          )}
        </DrawerTitle>
      </DrawerHeader>

      <DrawerDescription className='text-center'>
        {formType === 'research' ? (
          <span className='text-sm opacity-50'>
            Partisipasi Anda sangat berharga bagi kami dan akan membantu kami
            dalam mengembangkan solusi yg lebih baik untuk kebutuhan Anda.
          </span>
        ) : (
          <span className='text-sm opacity-50'>
            Hasil test ini akan memberikan wawasan berharga tentang kesehatan
            mental Anda
          </span>
        )}
      </DrawerDescription>

      <DrawerFooter className='mt-2 flex flex-col gap-4 text-gray-600'>
        {formType !== 'research' && (
          <Button
            className='bg-secondary h-full w-full rounded-xl p-4 text-white'
            onClick={() => handleSubmitQuestionnaire('result')}
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
            formType !== 'research'
              ? 'border-secondary text-secondary bg-transparent hover:bg-gray-100'
              : 'hover:bg-secondary/90 bg-secondary border-transparent text-white'
          }`}
          onClick={() => {
            handleSubmitQuestionnaire('close');
          }}
        >
          Close
        </Button>
      </DrawerFooter>
    </>
  );

  if (isBuilding) {
    return (
      <div className='flex min-h-screen min-w-full items-center justify-center'>
        <LoadingSpinnerIcon
          width={56}
          height={56}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  return (
    <RendererThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className='custom-smart-form' onChange={handleResponseChange}>
          <BaseRenderer />
        </div>
      </QueryClientProvider>
      <div className='flex-flex-col mt-4 px-2'>
        {requiredItemEmpty > 0 ? (
          <div className='text-destructive mb-2 w-full text-sm'>
            Terdapat {requiredItemEmpty} pertanyaan wajib yang belum terisi, yuk
            dilengkapi dulu!
          </div>
        ) : (
          ''
        )}
        <Button
          disabled={
            submitQuestionnaireIsLoading ||
            requiredItemEmpty > 0 ||
            (role === Roles.Practitioner && !patientId)
          }
          className='bg-secondary w-full text-white'
          onClick={handleValidation}
        >
          {submitQuestionnaireIsLoading ? (
            <LoadingSpinnerIcon stroke='white' />
          ) : (
            'Kirim'
          )}
        </Button>
      </div>

      <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          {renderDrawerContent}
        </DrawerContent>
      </Drawer>
    </RendererThemeProvider>
  );
}

export default FhirFormsRenderer;
