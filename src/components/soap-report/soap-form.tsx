'use client';
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import PageLoader from '@/components/general/page-loader';
import { SmartFormShell } from '@/components/general/smart-form-shell';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { useRequiredValidation } from '@/hooks/useRequiredValidation';
import { dbDelete, dbGet, STORES } from '@/lib/indexeddb';
import { useSubmitSoapBundle } from '@/services/api/assessment';
import { toCanonicalQuestionnaireUrl } from '@/utils/fhir/questionnaire-url';
import {
  buildForm,
  destroyForm,
  extractObservationBased,
  getResponse,
  RendererThemeProvider
} from '@aehrc/smart-forms-renderer';
import { Bundle, Questionnaire, QuestionnaireResponse } from 'fhir/r4';
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
 * Builds the QuestionnaireResponse resource submitted for a SOAP note.
 *
 * Uses the canonical questionnaire url so the note stays searchable by Blaze's
 * `questionnaire` search parameter.
 *
 * @param questionnaireResponse - The in-progress response from the form.
 * @param author - Practitioner author reference.
 * @param subject - Patient subject reference.
 * @param timestamp - Authored ISO timestamp.
 * @returns The completed QuestionnaireResponse resource.
 */
export function buildSoapResponseResource(
  questionnaireResponse: QuestionnaireResponse,
  author: { reference: string },
  subject: { reference: string },
  timestamp: string
): QuestionnaireResponse {
  const { id, item, resourceType } = questionnaireResponse;
  return {
    id,
    item,
    resourceType,
    status: 'completed',
    authored: timestamp,
    author,
    subject,
    questionnaire: toCanonicalQuestionnaireUrl('soap')
  };
}

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

  const { mutateAsync: submitSoapBundle, isPending: isSubmitSoapLoading } =
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

        destroyForm();
        await buildForm({
          questionnaire,
          questionnaireResponse: finalResponse,
          readOnly: mode === 'view',
          terminologyServerUrl: process.env.NEXT_PUBLIC_TX_URL
        });
      } catch (err) {
        setIsBuilding(false);
        toast.error(err);
      } finally {
        setIsBuilding(false);
      }
    };

    runBuildForm().catch(console.error);
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

      const timestamp = new Date().toISOString();

      const qrResource = buildSoapResponseResource(
        questionnaireResponse,
        author,
        subject,
        timestamp
      );

      const { id } = questionnaireResponse;

      const bundle: Bundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            resource: qrResource,
            request: {
              method: 'PUT',
              url: `QuestionnaireResponse/${id}`
            }
          },
          ...observations.map(obs => {
            // ensure all coding.system is set to loinc.org
            const fixedCode = {
              ...obs.code,
              coding: obs.code.coding?.map(coding => ({
                ...coding,
                system: 'https://loinc.org'
              }))
            };

            return {
              resource: {
                ...obs,
                code: fixedCode,
                subject,
                performer: [author]
              },
              request: {
                method: 'POST' as const,
                url: 'Observation'
              }
            };
          })
        ]
      };

      const submitResult = await submitSoapBundle(bundle);

      if (submitResult) {
        toast.success(
          `SOAP berhasil ${mode === 'create' ? 'dikirim' : 'diupdate'}`
        );
        dbDelete(STORES.soapDrafts, [practitionerId, patientId]).catch(
          (err: unknown) => console.warn('[IndexedDB]', err)
        );
        router.push('/');
      }
    } catch (error) {
      toast.error('SOAP gagal dikirim');
      console.error('Error message :', error);
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
                handleSubmitSoap().catch(console.error);
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
