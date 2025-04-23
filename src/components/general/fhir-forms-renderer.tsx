import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  useResultBrief,
  useSubmitQuestionnaire
} from '@/services/api/assessment';
import Image from 'next/image';
import Link from 'next/link';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
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
import { useEffect, useState } from 'react';

interface FhirFormsRendererProps {
  questionnaire: Questionnaire;
  isAuthenticated: Boolean;
  submitText?: string;
  customObject?: Object;
  type?: string;
}

function FhirFormsRenderer(props: FhirFormsRendererProps) {
  const { questionnaire, isAuthenticated } = props;
  const [response, setResponse] = useState<QuestionnaireResponse | null>(null);
  const [resultBrief, setResultBrief] = useState(null);
  const [requiredItemEmpty, setRequiredItemEmpty] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  const queryClient = useRendererQueryClient();
  const isBuilding = useBuildForm(questionnaire, response);

  const {
    mutate: submitQuestionnaire,
    isLoading: submitQuestionnaireIsLoading
  } = useSubmitQuestionnaire(questionnaire.id);

  const { mutate: fetchResultBrief, isLoading: fetchResultBriefisLoading } =
    useResultBrief(questionnaire.id);

  const invalidItems = useQuestionnaireResponseStore.use.invalidItems();

  useEffect(() => {
    const savedResponses = localStorage.getItem('questionnaire-responses');
    if (savedResponses) {
      setResponse(JSON.parse(savedResponses));
    }
  }, []);

  const handleResponseChange = () => {
    const questionnaireResponse = getResponse();
    localStorage.setItem(
      'questionnaire-responses',
      JSON.stringify(questionnaireResponse)
    );
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
      const questionnaireResponse = getResponse();

      /* Check if the questionnaire response contains an item with linkId = 'interpretation'.
       * If it does, extract the item and send it to the webhook. */
      const interpretationItem = questionnaireResponse.item.find(
        item => item.linkId === 'interpretation'
      );

      if (!interpretationItem) {
        // setResponse({ ...questionnaireResponse, ...props.customObject });
        submitQuestionnaire(questionnaireResponse, {
          onSuccess: result => {
            setResponse(result);
            setIsOpen(true);
          }
        });
        localStorage.removeItem('questionnaire-responses');
        return;
      }

      const payload = {
        questionnaire: questionnaireResponse.questionnaire,
        description: questionnaire.description,
        item: interpretationItem.item
      };

      fetchResultBrief(payload, {
        onSuccess: result => {
          interpretationItem.item.push(result[0]);

          // setResponse({ ...questionnaireResponse, ...props.customObject });
          setResultBrief(result[0]);

          submitQuestionnaire(questionnaireResponse, {
            onSuccess: result => {
              localStorage.removeItem('questionnaire-responses');
              setResponse(result);
              setIsOpen(true);
            }
          });
        }
      });
    }
  };

  useEffect(() => {
    if (Object.keys(invalidItems).length === 0) setRequiredItemEmpty(0);
    if (requiredItemEmpty > 0) checkRequiredIsEmpty();
  }, [invalidItems]);

  const renderDrawerContent = (
    <>
      <DrawerHeader className='mx-auto flex flex-col items-center gap-4 text-[20px]'>
        <Image
          className='rounded-[8px] object-cover'
          src={'/images/submit-questionnaire.png'}
          height={200}
          width={200}
          alt='success'
        />
        <DrawerTitle className='text-center'>
          {props.type === 'research' ? (
            <>
              <div className='mb-2 text-2xl font-bold'>
                Terima Kasih Karena Telah Berpatisipasi Dalam Research
              </div>
              <div className='text-sm opacity-50'>
                Partisipasi Anda sangat berharga bagi kami dan akan membantu
                kami dalam mengembangkan solusi yg lebih baik untuk kebutuhan
                Anda.
              </div>
            </>
          ) : (
            <>
              <div className='mb-2 text-2xl font-bold'>
                Selamat Anda Menyelesaikan Test
              </div>
              <div className='text-sm opacity-50'>
                Hasil test ini akan memberikan wawasan berharga tentang
                kesehatan mental Anda
              </div>
            </>
          )}
        </DrawerTitle>
      </DrawerHeader>

      <DrawerFooter className='mt-2 flex flex-col gap-4 text-gray-600'>
        {resultBrief && response && (
          <Link
            href={{
              pathname: `/record/${response.id}`,
              query: {
                type: 1,
                title: questionnaire.title
              }
            }}
          >
            <Button className='h-full w-full rounded-xl bg-secondary p-4 text-white'>
              See result
            </Button>
          </Link>
        )}
        <DrawerClose
          className={`items-center justify-center rounded-xl border border-solid p-4 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50 ${
            resultBrief
              ? 'border-secondary bg-transparent text-secondary hover:bg-gray-100'
              : 'hover:bg-secondary/90 border-transparent bg-secondary text-white'
          }`}
        >
          Close
        </DrawerClose>
      </DrawerFooter>
    </>
  );

  if (isBuilding || fetchResultBriefisLoading) {
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
          <div className='mb-2 w-full text-sm text-destructive'>
            Terdapat {requiredItemEmpty} pertanyaan wajib yang belum terisi, yuk
            dilengkapi dulu!
          </div>
        ) : (
          ''
        )}
        <Button
          disabled={submitQuestionnaireIsLoading || requiredItemEmpty > 0}
          className='w-full bg-secondary text-white'
          onClick={handleValidation}
        >
          {submitQuestionnaireIsLoading ? (
            <LoadingSpinnerIcon stroke='white' />
          ) : (
            props.submitText || 'Kirim'
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
