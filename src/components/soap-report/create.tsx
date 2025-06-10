'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { getFromLocalStorage } from '@/lib/utils';
import { useSubmitSoapBundle } from '@/services/api/assessment';
import {
  BaseRenderer,
  extractObservationBased,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
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
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  questionnaire: Questionnaire;
  patientId: string;
  practitionerId: string;
};

// NOTE: hardcoded
const terminologyServer = 'https://tx.konsulin.care/fhir';

export default function CreateSoap({
  questionnaire,
  patientId,
  practitionerId
}: Props) {
  const [response, setResponse] = useState<QuestionnaireResponse | null>(null);
  const [requiredItemEmpty, setRequiredItemEmpty] = useState<number>(0);
  const router = useRouter();

  const queryClient = useRendererQueryClient();
  const isBuilding = useBuildForm(
    questionnaire,
    response,
    false,
    terminologyServer
  );

  const { mutateAsync: submitSoapBundle, isLoading: isSubmitSoapLoading } =
    useSubmitSoapBundle();

  const invalidItems = useQuestionnaireResponseStore.use.invalidItems();

  useEffect(() => {
    const savedResponses = getFromLocalStorage('response_soap');
    if (savedResponses) {
      setResponse(JSON.parse(savedResponses));
    }
  }, []);

  const handleResponseChange = () => {
    const questionnaireResponse = getResponse();
    localStorage.setItem(
      'response_soap',
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

      const { item, resourceType } = questionnaireResponse;

      const timestamp = new Date().toISOString();

      /**
       * generate a unique temporary fullUrl identifier for the QuestionnaireResponse.
       * this allows related Observations to safely reference it using `derivedFrom`.
       * */
      const tempIdentifier = uuidv4();

      const qrResource = {
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
            fullUrl: tempIdentifier,
            resource: qrResource as QuestionnaireResponse,
            request: {
              method: 'POST',
              url: 'QuestionnaireResponse'
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
                performer: [author],
                derivedFrom: [{ reference: tempIdentifier }]
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
        localStorage.removeItem('response_soap');
        router.push('/');
      }
    } catch (error) {
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
      </div>
    </RendererThemeProvider>
  );
}
