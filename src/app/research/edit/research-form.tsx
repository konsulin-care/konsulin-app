'use client';

import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import type {
  Bundle,
  PlanDefinition,
  Questionnaire,
  ResearchStudy
} from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { schema } from '../register/research-form';
import { Step1, Step2, Step3 } from '../register/research-form-steps';

export type FormData = z.infer<typeof schema>;

interface EditResearchFormProps {
  study: ResearchStudy;
  planDefinitions: PlanDefinition[];
}

const extractIdFromReference = (ref?: string): string | null => {
  if (!ref) return null;
  const parts = ref.split('/').filter(Boolean);
  return parts.at(-1) ?? null;
};

const mapToFormData = (
  study: ResearchStudy,
  planDefinitions: PlanDefinition[]
): FormData => ({
  title: study.title ?? '',
  description: study.description ?? '',
  batches: planDefinitions
    .toSorted((a, b) =>
      (a.effectivePeriod?.start ?? '').localeCompare(
        b.effectivePeriod?.start ?? ''
      )
    )
    .map(plan => ({
      startDate: plan.effectivePeriod?.start ?? '',
      endDate: plan.effectivePeriod?.end ?? '',
      questionnaireIds: (plan.action ?? [])
        .map(a => extractQuestionnaireId(a.definitionCanonical))
        .filter((id): id is string => id !== null)
    }))
});

const mapToPlanIds = (
  study: ResearchStudy,
  planDefinitions: PlanDefinition[]
): string[] => {
  const planIdMap = new Map(planDefinitions.map(p => [p.id, p.id]));
  return (study.protocol ?? [])
    .map(ref => extractIdFromReference(ref.reference))
    .filter((id): id is string => id !== null && planIdMap.has(id));
};

const computeLockedBatchIndices = (batches: FormData['batches']): number[] => {
  const today = new Date().toISOString().slice(0, 10);
  return batches
    .map((batch, i) => ({ batch, i }))
    .filter(
      ({ batch }) =>
        batch.endDate < today ||
        (batch.startDate <= today && batch.endDate >= today)
    )
    .map(({ i }) => i);
};

/**
 * Edit form for an existing research study.
 *
 * Fetches the study and its PlanDefinitions, maps them to form data,
 * and submits changes via a FHIR transaction bundle.
 */
export default function EditResearchForm({
  study,
  planDefinitions
}: Readonly<EditResearchFormProps>) {
  const router = useRouter();
  useAuth();
  const initialData = useMemo(
    () => mapToFormData(study, planDefinitions),
    [study, planDefinitions]
  );
  const planIds = useMemo(
    () => mapToPlanIds(study, planDefinitions),
    [study, planDefinitions]
  );
  const lockedBatchIndices = useMemo(
    () => computeLockedBatchIndices(initialData.batches),
    [initialData.batches]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars, sonarjs/no-dead-store
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData
  });

  const {
    register,
    control,
    setValue,
    formState: { errors }
  } = form;
  const { fields, append, remove } = useFieldArray<FormData>({
    control,
    name: 'batches'
  });

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
      if (!lockedBatchIndices.includes(index)) {
        setValue(`batches.${index}.questionnaireIds`, ids);
      }
    }
  };

  const handleCustomUpload = (q: Questionnaire | null) => {
    if (!q?.id) return;
    handleSelectLibrary([...selectedIds, q.id]);
  };

  const buildStudyEntry = (data: FormData) => {
    const starts = data.batches
      .map(b => b.startDate)
      .toSorted((a, b) => a.localeCompare(b));
    const ends = data.batches
      .map(b => b.endDate)
      .toSorted((a, b) => a.localeCompare(b));
    return {
      resource: {
        resourceType: 'ResearchStudy' as const,
        id: study.id,
        title: data.title,
        description: data.description,
        status: study.status,
        principalInvestigator: study.principalInvestigator,
        protocol: planIds.map(id => ({ reference: `PlanDefinition/${id}` })),
        period: { start: starts[0], end: ends.at(-1) }
      },
      request: { method: 'PUT' as const, url: `ResearchStudy/${study.id}` }
    };
  };

  const isBatchModified = (
    batch: FormData['batches'][number],
    planId: string
  ): boolean => {
    const original = planDefinitions.find(p => p.id === planId);
    if (!original) return true;
    const originalQs = (original.action ?? [])
      .map(a => extractQuestionnaireId(a.definitionCanonical))
      .filter((id): id is string => id !== null);
    const datesChanged =
      batch.startDate !== (original.effectivePeriod?.start ?? '') ||
      batch.endDate !== (original.effectivePeriod?.end ?? '');
    const qIdsChanged =
      JSON.stringify(
        batch.questionnaireIds.toSorted((a, b) => a.localeCompare(b))
      ) !== JSON.stringify(originalQs.toSorted((a, b) => a.localeCompare(b)));
    return datesChanged || qIdsChanged;
  };

  const buildPlanEntries = (data: FormData) =>
    data.batches.flatMap((batch, i) => {
      if (lockedBatchIndices.includes(i)) return [];
      const planId = planIds[i];
      if (!planId || !isBatchModified(batch, planId)) return [];
      const original = planDefinitions.find(p => p.id === planId);
      return [
        {
          resource: {
            resourceType: 'PlanDefinition' as const,
            id: planId,
            title: original?.title ?? `Batch ${i + 1}`,
            status: 'active' as const,
            effectivePeriod: { start: batch.startDate, end: batch.endDate },
            action: batch.questionnaireIds.map(qId => ({
              definitionCanonical: `Questionnaire/${qId}`
            }))
          },
          request: { method: 'PUT' as const, url: `PlanDefinition/${planId}` }
        }
      ];
    });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars, sonarjs/no-dead-store -- will be used by FAB in Task 9
  const onSubmitForm = async (data: FormData) => {
    try {
      const API = await getAPI();
      const entries = [buildStudyEntry(data), ...buildPlanEntries(data)];
      await API.post('/fhir', {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: entries
      });
      toast.success('Study updated successfully');
      router.push('/research');
    } catch {
      toast.error('Failed to update study. Please try again.');
    }
  };

  return (
    <div className='space-y-4'>
      <h1 className='text-lg font-bold'>Edit Research</h1>
      {step === 1 && <Step1 register={register} errors={errors} />}
      {step === 2 && (
        <Step2
          libraryOptions={libraryOptions}
          selectedIds={selectedIds}
          onSelect={handleSelectLibrary}
          onCustomUpload={handleCustomUpload}
        />
      )}
      {step === 3 && (
        <Step3
          fields={fields}
          errors={errors}
          batches={form.getValues('batches')}
          setValue={setValue}
          onAddBatch={() =>
            append({ startDate: '', endDate: '', questionnaireIds: [] })
          }
          onRemoveBatch={remove}
          lockedBatchIndices={lockedBatchIndices}
        />
      )}
    </div>
  );
}
