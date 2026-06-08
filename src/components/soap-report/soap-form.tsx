'use client';

import PageLoader from '@/components/general/page-loader';
import { SmartFormShell } from '@/components/general/smart-form-shell';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { useRequiredValidation } from '@/hooks/useRequiredValidation';
import { dbDelete, dbGet, STORES } from '@/lib/indexeddb';
import { useSubmitSoapBundle } from '@/services/api/assessment';
import {
  buildForm,
  extractObservationBased,
  getResponse,
  RendererThemeProvider
} from '@aehrc/smart-forms-renderer';
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

/**
 *
 */
export default function SoapForm({
  questionnaire,
  patientId,
  practitionerId,
  mode,
  questionnaireResponse,
  isAuthorSame
}: Props) {
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const titleParam = searchParams?.get('title');
  const categoryParam = searchParams?.get('category');

  const { mutateAsync: submitSoapBundle, isLoading: isSubmitSoapLoading } =
    useSubmitSoapBundle();

  const { requiredItemEmpty, checkRequiredIsEmpty, invalidItems } =
    useRequiredValidation();

  useEffect(() => {
    if (!questionnaire) return;

    /** Loads draft or existing response and builds the smart form. */
    const runBuildForm = async () => {
      setIsBuilding(true);
      try {
        let finalResponse: QuestionnaireResponse | null = null;
        if (mode === 'view') {
          finalResponse = questionnaireResponse;
        } else {
          const ownerId = practitionerId;
          const saved = await dbGet<{ draft: QuestionnaireResponse }>(
            STORES.soapDrafts,
            [ownerId, patientId]
          );
          finalResponse = saved?.draft ?? questionnaireResponse ?? null;
        }

        await buildForm(
          questionnaire,
          finalResponse,
          mode === 'view',
          process.env.NEXT_PUBLIC_TX_URL
        );
      } catch (err) {
        setIsBuilding(false);
        toast.error(err);
      } finally {
        setIsBuilding(false);
      }
    };

    runBuildForm();
  }, [questionnaire, mode, questionnaireResponse, patientId, practitionerId]);

  const handleResponseChange = useDraftAutoSave(STORES.soapDrafts, qr => ({
    practitionerId: practitionerId || '',
    patientId,
    draft: qr,
    updatedAt: Date.now()
  }));

  /** Validates required SOAP fields and returns whether form is valid. */
  const handleValidation = () => {
    checkRequiredIsEmpty();

    return Object.keys(invalidItems).length === 0;
  };

  /** Submits the SOAP bundle and cleans up drafts on success. */
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
        dbDelete(STORES.soapDrafts, [practitionerId, patientId]).catch(err =>
          console.warn('[IndexedDB]', err)
        );
        router.push('/');
      }
    } catch (error) {
      toast.error('SOAP gagal dikirim');
      console.log('Error message :', error);
      toast.error('An error occurred while submitting the SOAP');
    }
  };

  if (isBuilding) {
    return <PageLoader />;
  }

  return (
    <RendererThemeProvider>
      <SmartFormShell
        className='custom-soap-form'
        onChange={handleResponseChange}
      />
      <div className='flex-flex-col px-2'>
        {requiredItemEmpty > 0 || !patientId ? (
          <div className='text-destructive mb-2 w-full text-sm'>
            Masih ada kolom wajib yang belum terisi, yuk dilengkapi dulu!
          </div>
        ) : (
          ''
        )}
        {mode !== 'view' && (
          <Button
            disabled={isSubmitSoapLoading || requiredItemEmpty > 0}
            className='bg-secondary w-full text-white'
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
            className='bg-secondary w-full text-white'
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
