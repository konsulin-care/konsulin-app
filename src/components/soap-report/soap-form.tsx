'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { getFromLocalStorage } from '@/lib/utils';
import { useSubmitSoapBundle } from '@/services/api/assessment';
import {
  BaseRenderer,
  buildForm,
  extractObservationBased,
  getResponse,
  RendererThemeProvider,
  useQuestionnaireResponseStore,
  useRendererQueryClient
} from '@aehrc/smart-forms-renderer';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  Bundle,
  BundleEntryRequest,
  Observation,
  Questionnaire,
  QuestionnaireResponse
} from 'fhir/r4';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  questionnaire: Questionnaire;
  patientId: string;
  practitionerId: string;
  mode: 'create' | 'view' | 'edit';
  questionnaireResponse?: QuestionnaireResponse;
  isAuthorSame?: boolean;
};

export default function SoapForm({
  questionnaire,
  patientId,
  practitionerId,
  mode,
  questionnaireResponse,
  isAuthorSame
}: Props) {
  const [requiredItemEmpty, setRequiredItemEmpty] = useState<number>(0);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const titleParam = searchParams?.get('title');
  const categoryParam = searchParams?.get('category');
  const localKey = `soap_${patientId}`;

  const queryClient = useRendererQueryClient();

  const { mutateAsync: submitSoapBundle, isLoading: isSubmitSoapLoading } =
    useSubmitSoapBundle();

  const invalidItems = useQuestionnaireResponseStore.use.invalidItems();

  useEffect(() => {
    if (!questionnaire) return;

    const runBuildForm = async () => {
      setIsBuilding(true);
      try {
        let finalResponse: QuestionnaireResponse | null = null;
        if (mode === 'view') {
          finalResponse = questionnaireResponse;
        } else {
          const savedResponses = getFromLocalStorage(localKey);
          finalResponse = savedResponses
            ? JSON.parse(savedResponses)
            : (questionnaireResponse ?? null);
        }

        await buildForm(
          questionnaire,
          finalResponse,
          mode === 'view',
          process.env.NEXT_PUBLIC_TERMINOLOGY_SERVER
        );
      } catch (err) {
        setIsBuilding(false);
        toast.error(err);
      } finally {
        setIsBuilding(false);
      }
    };

    runBuildForm();
  }, [questionnaire, mode, questionnaireResponse, patientId]);

  // add some delay to fetch the latest response after input settles
  const handleResponseChange = () => {
    setTimeout(() => {
      const questionnaireResponse = getResponse();
      localStorage.setItem(localKey, JSON.stringify(questionnaireResponse));
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
    checkRequiredIsEmpty();

    return Object.keys(invalidItems).length === 0;
  };

  const handleSubmitSoap = async () => {
    const questionnaireResponse = getResponse();
    const author = { reference: `Practitioner/${practitionerId}` };
    const subject = { reference: `Patient/${patientId}` };

    if (!questionnaireResponse || !practitionerId || !patientId) return;

    try {
      const observations = extractObservationBased(
        questionnaire,
        questionnaireResponse
      );

      const { item, resourceType, id } = questionnaireResponse;

      const timestamp = new Date().toISOString();

      const qrResource = {
        id,
        item,
        resourceType,
        status: 'completed',
        authored: timestamp,
        author,
        subject,
        questionnaire: 'Questionnaire/soap'
      };

      const bundle: Bundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: qrResource as QuestionnaireResponse,
            request: {
              method: 'PUT',
              url: `QuestionnaireResponse/${id}`
            }
          },
          ...observations.map(obs => {
            // ensure all coding.system is set to "http://loinc.org"
            const fixedCode = {
              ...obs.code,
              coding: obs.code.coding?.map(coding => ({
                ...coding,
                system: 'http://loinc.org'
              }))
            };

            return {
              resource: {
                ...obs,
                code: fixedCode,
                subject,
                performer: [author]
              } as Observation,
              request: {
                method: 'POST',
                url: 'Observation'
              } as BundleEntryRequest
            };
          })
        ]
      };

      const submitResult = await submitSoapBundle(bundle);

      if (submitResult) {
        toast.success(
          `SOAP berhasil ${mode === 'create' ? 'dikirim' : 'diupdate'}`
        );
        localStorage.removeItem(localKey);
        router.push('/');
      }
    } catch (error) {
      toast.error('SOAP gagal dikirim');
      console.log('Error message :', error);
      toast.error('An error occurred while submitting the SOAP');
    }
  };

  useEffect(() => {
    if (Object.keys(invalidItems).length === 0) setRequiredItemEmpty(0);
    if (requiredItemEmpty > 0) checkRequiredIsEmpty();
  }, [invalidItems]);

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
        <div className='custom-soap-form' onChange={handleResponseChange}>
          <BaseRenderer />
        </div>
      </QueryClientProvider>
      <div className='flex-flex-col px-2'>
        {requiredItemEmpty > 0 || !patientId ? (
          <div className='mb-2 w-full text-sm text-destructive'>
            Masih ada kolom wajib yang belum terisi, yuk dilengkapi dulu!
          </div>
        ) : (
          ''
        )}
        {mode !== 'view' && (
          <Button
            disabled={isSubmitSoapLoading || requiredItemEmpty > 0}
            className='w-full bg-secondary text-white'
            onClick={() => {
              const isValid = handleValidation();
              if (isValid) {
                handleSubmitSoap();
              }
            }}
          >
            {isSubmitSoapLoading ? (
              <LoadingSpinnerIcon stroke='white' />
            ) : (
              'Save SOAP'
            )}
          </Button>
        )}

        {mode === 'view' && (
          <Button
            className='w-full bg-secondary text-white'
            disabled={!isAuthorSame}
            onClick={() => {
              const queryParams = new URLSearchParams({
                category: categoryParam,
                title: titleParam
              }).toString();
              router.push(`${pathname}/edit?${queryParams}`);
            }}
          >
            Edit SOAP
          </Button>
        )}
      </div>
    </RendererThemeProvider>
  );
}
