'use client';

import FeeInput from '@/components/shared/fee-input';
import QuestionnaireUploader from '@/components/shared/questionnaire-uploader';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ASSESSMENT_CATEGORIES } from '@/constants/assessment-categories';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { setQuestionnaireDuration } from '@/utils/fhir/duration';
import { setFee } from '@/utils/fhir/fee';
import { setQuestionnaireCategory } from '@/utils/fhir/questionnaire-category';
import { setQuestionnaireImageUrl } from '@/utils/fhir/questionnaire-image';
import {
  appendQuestionnaireContact,
  setQuestionnairePublisherDate
} from '@/utils/fhir/questionnaire-metadata';
import { useQueryClient } from '@tanstack/react-query';
import type { Questionnaire } from 'fhir/r4';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
};

type FormState = {
  questionnaire: Questionnaire | null;
  imageUrl: string;
  duration: string;
  fee: string;
  category: string;
};

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
}): Promise<void> {
  const API = await getAPI();

  let payload: Questionnaire = params.questionnaire;
  if (params.imageUrl) {
    payload = setQuestionnaireImageUrl(payload, params.imageUrl);
  }
  payload = setQuestionnaireDuration(payload, params.duration);
  if (params.fee > 0) payload = setFee(payload, params.fee);
  payload = setQuestionnaireCategory(
    payload,
    params.categoryCode,
    params.categoryLabel
  );
  payload = setQuestionnairePublisherDate(
    payload,
    params.publisher,
    new Date().toISOString()
  );
  payload = appendQuestionnaireContact(payload, params.contact);
  payload = { ...payload, status: 'draft' };

  await API.post('/fhir/Questionnaire', payload);
}

/** Resolve the clinic Organization name to use as the publisher. */
async function resolvePublisherName(
  orgIdFromPref: string | undefined,
  fallbackOrgId: string | undefined
): Promise<string> {
  const orgId = orgIdFromPref ?? fallbackOrgId;
  if (!orgId) throw new Error('No clinic organization selected');

  const API = await getAPI();
  const orgResp = await API.get<{ name?: string }>(
    `/fhir/Organization/${orgId}?_elements=name`
  );
  return orgResp.data?.name ?? '';
}

/** Check that a value is an http(s) URL. */
function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** The five drawer fields: uploader, image URL, duration, fee, and category. */
function AssessmentFormFields({
  state,
  onChange
}: {
  readonly state: FormState;
  readonly onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label>Upload Questionnaire</Label>
        <QuestionnaireUploader
          value={state.questionnaire}
          onChange={q => onChange({ questionnaire: q })}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='assessment-image'>Image URL (optional)</Label>
        <Input
          id='assessment-image'
          type='url'
          value={state.imageUrl}
          onChange={e => onChange({ imageUrl: e.target.value })}
          placeholder='https://example.com/image.webp'
          className='bg-white'
          aria-label='Image URL (optional)'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='assessment-duration'>
          Estimated Duration (minutes)
        </Label>
        <Input
          id='assessment-duration'
          type='number'
          min='1'
          value={state.duration}
          onChange={e => onChange({ duration: e.target.value })}
          placeholder='10'
          className='bg-white'
          aria-label='Estimated Duration (minutes)'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='assessment-fee'>Fee</Label>
        <FeeInput
          id='assessment-fee'
          value={state.fee}
          onChange={fee => onChange({ fee })}
          placeholder='0'
          className='bg-white'
          aria-label='Fee'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='assessment-category'>Category</Label>
        <select
          id='assessment-category'
          value={state.category}
          onChange={e => onChange({ category: e.target.value })}
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
  );
}

/**
 * Drawer for adding a new Questionnaire to the clinic's assessment catalog.
 *
 * Accepts a FHIR R4 Questionnaire JSON, an optional image URL, an estimated
 * duration, an optional fee (IDR), and one of the seven assessment categories.
 * On submit, fills in the publisher (clinic Organization name), date, and
 * current user's contact, forces status=draft, and POSTs to /fhir/Questionnaire.
 */
export default function AddAssessmentDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient();
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
      const clinicPref = await dbGet<{ value: string }>(STORES.uiPreferences, [
        '',
        'clinic_organization'
      ]);
      const user = authState?.userInfo;
      const publisher = await resolvePublisherName(
        clinicPref?.value,
        user?.organizationId
      );

      await submitQuestionnaire({
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
        }
      });

      toast.success('Assessment added successfully');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['curated-assessments'] }),
        queryClient.invalidateQueries({ queryKey: ['featured-assessments'] })
      ]).catch(() => {
        /* cache invalidation best-effort */
      });
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to add assessment';
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
    authState?.userInfo,
    queryClient,
    onClose
  ]);

  return (
    <Drawer
      open={open}
      onOpenChange={o => {
        if (!o) onClose();
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Assessment</DrawerTitle>
          <DrawerDescription>
            Upload a questionnaire and set its display metadata.
          </DrawerDescription>
        </DrawerHeader>

        <div className='px-4'>
          <AssessmentFormFields
            state={form}
            onChange={patch => {
              setForm(prev => ({ ...prev, ...patch }));
            }}
          />
        </div>

        <DrawerFooter>
          <Button
            onClick={() => {
              handleSubmit().catch(() => {
                /* handled in handleSubmit */
              });
            }}
            disabled={!isValid || isSubmitting}
            variant='secondary'
            className='text-white'
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
