'use client';

import FeeInput from '@/components/shared/fee-input';
import QuestionnaireUploader from '@/components/shared/questionnaire-uploader';
import AppDrawer from '@/components/ui/app-drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ASSESSMENT_CATEGORIES } from '@/constants/assessment-categories';
import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { setQuestionnaireDuration } from '@/utils/fhir/duration';
import { setFee } from '@/utils/fhir/fee';
import { setQuestionnaireCategory } from '@/utils/fhir/questionnaire-category';
import { setQuestionnaireImageUrl } from '@/utils/fhir/questionnaire-image';
import {
  appendQuestionnaireContact,
  setQuestionnairePublisherDate
} from '@/utils/fhir/questionnaire-metadata';
import type { Questionnaire } from 'fhir/r4';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

interface QuestionnaireUploadDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onUploaded: (q: Questionnaire) => void;
  readonly showFee?: boolean;
  readonly showImage?: boolean;
  readonly context?: 'assessment' | 'research';
  readonly resolvePublisher: () => PromiseLike<string> | string;
}

type FormState = {
  questionnaire: Questionnaire | null;
  imageUrl: string;
  duration: string;
  fee: string;
  category: string;
};

/** Check that a value is an http(s) URL. */
function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Build the publishable Questionnaire and POST it to the FHIR API. */
async function submitQuestionnaire(params: {
  questionnaire: Questionnaire;
  imageUrl: string;
  duration: number;
  fee: number;
  categoryCode: string;
  categoryLabel: string;
  publisher: string;
  contact: { name?: string; email?: string; phone?: string };
  context: 'assessment' | 'research';
}): Promise<Questionnaire> {
  const API = await getAPI();

  let payload: Questionnaire = params.questionnaire;
  if (params.imageUrl) {
    payload = setQuestionnaireImageUrl(payload, params.imageUrl);
  }
  payload = setQuestionnaireDuration(payload, params.duration);
  if (params.fee > 0) payload = setFee(payload, params.fee);
  const contextCode =
    params.context === 'assessment' ? 'regular' : params.context;
  payload = setQuestionnaireCategory(
    payload,
    params.categoryCode,
    params.categoryLabel,
    contextCode
  );
  payload = setQuestionnairePublisherDate(
    payload,
    params.publisher,
    new Date().toISOString()
  );
  payload = appendQuestionnaireContact(payload, params.contact);
  payload = { ...payload, status: 'draft' };

  const res = await API.post<{ id: string }>('/fhir/Questionnaire', payload);
  return { ...payload, id: res.data.id };
}

/**
 * Shared drawer for uploading and enriching a FHIR Questionnaire.
 *
 * Used by both clinic admin (assessment context) and researcher (research context).
 * Collects metadata (duration, category, optionally fee and image),
 * enriches the Questionnaire, saves to server, and returns the saved resource.
 */
export default function QuestionnaireUploadDrawer({
  open,
  onClose,
  onUploaded,
  showFee = true,
  showImage = true,
  context = 'assessment',
  resolvePublisher
}: QuestionnaireUploadDrawerProps) {
  const { state: authState } = useAuth();
  const [form, setForm] = useState<FormState>({
    questionnaire: null,
    imageUrl: '',
    duration: '',
    fee: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset the form every time the drawer opens.
  useEffect(() => {
    if (!open) return;
    setForm({
      questionnaire: null,
      imageUrl: '',
      duration: '',
      fee: '',
      category: ''
    });
    setIsSubmitting(false);
  }, [open]);

  const parsedDuration = Number(form.duration);
  const hasValidDuration =
    Number.isFinite(parsedDuration) && parsedDuration > 0;
  const selectedCategory = ASSESSMENT_CATEGORIES.find(
    c => c.code === form.category
  );
  const hasValidImage = form.imageUrl === '' || isValidHttpUrl(form.imageUrl);
  const isValid =
    form.questionnaire !== null &&
    hasValidDuration &&
    selectedCategory !== undefined &&
    hasValidImage;

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting || !form.questionnaire || !selectedCategory) {
      return;
    }

    setIsSubmitting(true);
    try {
      const publisher = await resolvePublisher();
      const user = authState?.userInfo;

      const saved = await submitQuestionnaire({
        questionnaire: form.questionnaire,
        imageUrl: form.imageUrl,
        duration: parsedDuration,
        fee: Number(form.fee),
        categoryCode: selectedCategory.code,
        categoryLabel: selectedCategory.label,
        publisher,
        contact: {
          name: user?.fullname,
          email: user?.email,
          phone: user?.phoneNumber
        },
        context
      });

      toast.success(
        context === 'research'
          ? 'Questionnaire uploaded successfully'
          : 'Assessment added successfully'
      );
      onUploaded(saved);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload questionnaire';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    isSubmitting,
    form.questionnaire,
    form.imageUrl,
    parsedDuration,
    form.fee,
    selectedCategory,
    resolvePublisher,
    authState?.userInfo,
    context,
    onUploaded,
    onClose
  ]);

  const title =
    context === 'research' ? 'Upload Questionnaire' : 'Add Assessment';
  const description =
    context === 'research'
      ? 'Upload a questionnaire and set its metadata for research use.'
      : 'Upload a questionnaire and set its display metadata.';

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      ctaLabel='Submit'
      onCtaClick={() => {
        handleSubmit().catch(() => {
          /* handled in handleSubmit */
        });
      }}
      ctaDisabled={!isValid || isSubmitting}
      ctaLoading={isSubmitting}
    >
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label>Upload Questionnaire</Label>
          <QuestionnaireUploader
            value={form.questionnaire}
            onChange={q => {
              setForm(prev => ({ ...prev, questionnaire: q }));
            }}
          />
        </div>

        {showImage && (
          <div className='space-y-2'>
            <Label htmlFor='upload-image'>Image URL (optional)</Label>
            <Input
              id='upload-image'
              type='url'
              value={form.imageUrl}
              onChange={e => {
                setForm(prev => ({ ...prev, imageUrl: e.target.value }));
              }}
              placeholder='https://example.com/image.webp'
              className='bg-white'
              aria-label='Image URL (optional)'
            />
          </div>
        )}

        <div className='space-y-2'>
          <Label htmlFor='upload-duration'>Estimated Duration (minutes)</Label>
          <Input
            id='upload-duration'
            type='number'
            min='1'
            value={form.duration}
            onChange={e => {
              setForm(prev => ({ ...prev, duration: e.target.value }));
            }}
            placeholder='10'
            className='bg-white'
            aria-label='Estimated Duration (minutes)'
          />
        </div>

        {showFee && (
          <div className='space-y-2'>
            <Label htmlFor='upload-fee'>Fee</Label>
            <FeeInput
              id='upload-fee'
              value={form.fee}
              onChange={fee => {
                setForm(prev => ({ ...prev, fee }));
              }}
              placeholder='0'
              className='bg-white'
              aria-label='Fee'
            />
          </div>
        )}

        <div className='space-y-2'>
          <Label htmlFor='upload-category'>Category</Label>
          <select
            id='upload-category'
            value={form.category}
            onChange={e => {
              setForm(prev => ({ ...prev, category: e.target.value }));
            }}
            className='focus:ring-primary block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:outline-none'
            aria-label='Category'
          >
            <option value='' disabled>
              Select category
            </option>
            {ASSESSMENT_CATEGORIES.map(cat => (
              <option key={cat.code} value={cat.code}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </AppDrawer>
  );
}
