'use client';

import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type { Bundle, Questionnaire } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { Step1, Step2, Step3 } from './research-form-steps';

export const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  batches: z
    .array(
      z.object({
        startDate: z.string().min(1, 'Start date required'),
        endDate: z.string().min(1, 'End date required'),
        questionnaireIds: z
          .array(z.string())
          .min(1, 'Select at least one questionnaire')
      })
    )
    .min(1, 'At least one batch required')
});

export type FormData = z.infer<typeof schema>;

const getStorageKey = (userId: string | undefined) =>
  `research-form-${userId ?? 'anonymous'}`;

const loadFromStorage = (key: string) => {
  try {
    const stored = localStorage.getItem(key);
    if (stored)
      return JSON.parse(stored) as Partial<FormData> & { step?: number };
  } catch {
    /* corrupt data */
  }
  return null;
};

const createBatch = (date = ''): FormData['batches'][number] => ({
  startDate: date,
  endDate: date,
  questionnaireIds: []
});

const submitStudy = async (
  API: Awaited<ReturnType<typeof getAPI>>,
  data: FormData,
  userId: string | undefined,
  storageKey: string,
  router: ReturnType<typeof useRouter>
) => {
  const planIds: string[] = [];
  for (const batch of data.batches) {
    const res: { data: { id?: string } } = await API.post(
      '/fhir/PlanDefinition',
      {
        resourceType: 'PlanDefinition',
        title: `Batch ${planIds.length + 1}`,
        status: 'active',
        effectivePeriod: { start: batch.startDate, end: batch.endDate },
        action: batch.questionnaireIds.map(qId => ({
          definitionCanonical: `Questionnaire/${qId}`
        }))
      }
    );
    if (res.data.id) planIds.push(res.data.id);
  }

  const starts = data.batches
    .map(b => b.startDate)
    .toSorted((a, b) => a.localeCompare(b));
  const ends = data.batches
    .map(b => b.endDate)
    .toSorted((a, b) => a.localeCompare(b));

  await API.post('/fhir/ResearchStudy', {
    resourceType: 'ResearchStudy',
    title: data.title,
    description: data.description,
    status: 'active',
    principalInvestigator: { reference: `Practitioner/${userId}` },
    protocol: planIds.map(id => ({ reference: `PlanDefinition/${id}` })),
    period: { start: starts[0], end: ends.at(-1) }
  });

  localStorage.removeItem(storageKey);
  toast.success('Research study created successfully');
  router.push('/');
};

/**
 *
 */
export default function ResearchForm() {
  const router = useRouter();
  const { state: authState } = useAuth();
  const userId = authState?.userInfo?.fhirId;
  const storageKey = getStorageKey(userId);
  const storedData = useRef(loadFromStorage(storageKey));
  const [step, setStep] = useState(storedData.current?.step ?? 1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [, setCustomQs] = useState<Questionnaire[]>([]);
  const isInitialMount = useRef(true);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: storedData.current?.title ?? '',
      description: storedData.current?.description ?? '',
      batches: storedData.current?.batches ?? [createBatch()]
    }
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors }
  } = form;
  // eslint-disable-next-line react-hooks/incompatible-library
  const formValues = watch();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'batches'
  });

  useEffect(() => {
    const persist = () => {
      localStorage.setItem(storageKey, JSON.stringify({ ...formValues, step }));
    };
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return () => {
        /* noop */
      };
    }
    const id = setTimeout(persist, 500);
    return () => clearTimeout(id);
  }, [formValues, step, storageKey]);

  const { data: libraryQs = [] } = useQuery({
    queryKey: ['questionnaire-library'],
    queryFn: async () => {
      const API = await getAPI();
      const res = await API.get<Bundle>(
        '/fhir/Questionnaire?context=popular,regular&status=active&_elements=id,title,description,extension'
      );
      return (res.data.entry ?? []).map(e => e.resource as Questionnaire);
    },
    enabled: step === 2
  });

  const libraryOptions = libraryQs.map(q => ({
    code: q.id ?? '',
    name: q.title ?? q.id ?? ''
  }));

  const handleSelectLibrary = (ids: string[]) => {
    setSelectedIds(ids);
    for (const [index] of fields.entries()) {
      setValue(`batches.${index}.questionnaireIds`, ids);
    }
  };

  const handleCustomUpload = (q: Questionnaire | null) => {
    if (!q?.id) return;
    setCustomQs(prev => [...prev, q]);
    handleSelectLibrary([...selectedIds, q.id]);
  };

  const onSubmitForm = async (data: FormData) => {
    try {
      const API = await getAPI();
      await submitStudy(API, data, userId, storageKey, router);
    } catch {
      toast.error('Failed to create research study. Please try again.');
    }
  };

  return (
    <div className='space-y-4'>
      <h1 className='text-lg font-bold'>Register New Research</h1>
      {step === 1 && (
        <Step1
          onNext={valid => {
            if (valid) setStep(2);
          }}
          trigger={trigger}
          register={register}
          errors={errors}
        />
      )}
      {step === 2 && (
        <Step2
          libraryOptions={libraryOptions}
          selectedIds={selectedIds}
          onSelect={handleSelectLibrary}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          onCustomUpload={handleCustomUpload}
        />
      )}
      {step === 3 && (
        <Step3
          fields={fields}
          errors={errors}
          register={register}
          onBack={() => setStep(2)}
          onSubmit={() => void handleSubmit(onSubmitForm)()}
          onAddBatch={() => append(createBatch())}
          onRemoveBatch={remove}
        />
      )}
    </div>
  );
}
