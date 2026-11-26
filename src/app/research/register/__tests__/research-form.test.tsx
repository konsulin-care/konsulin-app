import { renderWithQuery } from '@/__tests__/react-test-utils';
import {
  getEthicsStatus,
  getSharesFindings,
  getWhoCanJoin
} from '@/utils/fhir/study-metadata';
import { screen } from '@testing-library/react';
import type { ResearchStudy } from 'fhir/r4';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { schema, submitStudy, type FormData } from '../research-form';
import {
  Step1,
  Step2,
  Step3,
  TitleStepMetadataProvider
} from '../research-form-steps';

afterEach(() => {
  localStorage.clear();
});

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});
vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'test-practitioner-id',
        role_name: 'Researcher'
      }
    },
    isLoading: false
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

/** Minimal mock for UseFormRegister — returns an empty handler object. */
function mockRegister() {
  return vi.fn((name: string) => ({
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
    name: name as never
  }));
}

const mockBatch = { startDate: '', endDate: '', questionnaireIds: [] };
const mockField = {
  id: '1',
  name: 'batches.0' as const,
  ...mockBatch
};

describe('schema - targetParticipants', () => {
  const validForm = {
    title: 'My Study',
    description: 'Study description',
    batches: [
      {
        startDate: '2024-01-01',
        endDate: '2024-02-01',
        questionnaireIds: ['q1']
      }
    ]
  };

  it('rejects a missing, zero, negative or fractional target', () => {
    for (const targetParticipants of [undefined, 0, -5, 1.5]) {
      const result = schema.safeParse({ ...validForm, targetParticipants });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(issue => issue.message === 'target_required')
        ).toBe(true);
      }
    }
  });
});

describe('Step1 - Title & Description', () => {
  it('renders title input and description textarea', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('labels the description field without (optional)', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  });

  it('has no Back, Next, or Submit buttons', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    expect(
      screen.queryByRole('button', { name: /back/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /next/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit/i })
    ).not.toBeInTheDocument();
  });

  it('is not a form element', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('renders a number input labelled Target participants', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    const input = screen.getByLabelText(/target participants/i);
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('inputMode', 'numeric');
  });
});

describe('Step2 - Questionnaire Selection', () => {
  it('renders From Library section and Upload Custom button', () => {
    renderWithQuery(
      <Step2
        libraryOptions={[]}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('Questionnaire Selection')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload custom questionnaire/i })
    ).toBeInTheDocument();
  });

  it('calls onOpenUploadDrawer when button is clicked', () => {
    const onOpenUploadDrawer = vi.fn();
    renderWithQuery(
      <Step2
        libraryOptions={[]}
        selectedIds={[]}
        onSelect={vi.fn()}
        onOpenUploadDrawer={onOpenUploadDrawer}
      />
    );

    const button = screen.getByRole('button', {
      name: /upload custom questionnaire/i
    });
    button.click();

    expect(onOpenUploadDrawer).toHaveBeenCalledTimes(1);
  });

  it('shows selected count when questionnaires are selected', () => {
    renderWithQuery(
      <Step2
        libraryOptions={[
          { code: 'phq2', name: 'PHQ-2', duration: null, category: null }
        ]}
        selectedIds={['phq2']}
        onSelect={vi.fn()}
        onOpenUploadDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('Selected (1)')).toBeInTheDocument();
  });
});

describe('Step3 - Batch Configuration', () => {
  /** Renders Step3 with a single default batch field. */
  function renderStep3() {
    renderWithQuery(
      <Step3
        fields={[mockField]}
        errors={{}}
        batches={[mockBatch]}
        setValue={vi.fn()}
        onAddBatch={vi.fn()}
        onRemoveBatch={vi.fn()}
      />
    );
  }

  it('renders batch configuration heading and Add Batch button', () => {
    renderStep3();

    expect(screen.getByText(/batch configuration/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /add batch/i })
    ).toBeInTheDocument();
  });

  it('has no Back or Submit buttons', () => {
    renderStep3();

    expect(
      screen.queryByRole('button', { name: /back/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit/i })
    ).not.toBeInTheDocument();
  });

  it('renders date picker buttons for each batch', () => {
    renderStep3();

    expect(
      screen.getByRole('button', { name: /select start date/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /select end date/i })
    ).toBeInTheDocument();
  });
});

describe('Step1 - study metadata', () => {
  /** Renders Step1 with the metadata provider backed by a live form. */
  function MetadataHarness() {
    const { register, control } = useForm<FormData>({
      defaultValues: {
        title: '',
        researchQuestion: '',
        ethicsStatus: 'applying',
        sharesFindings: false
      }
    });
    return (
      <TitleStepMetadataProvider
        value={{ groupName: 'Klinik Sehat Jiwa', control }}
      >
        <Step1 register={register} errors={{}} />
      </TitleStepMetadataProvider>
    );
  }

  it('renders the metadata fields inside the title step', () => {
    renderWithQuery(<MetadataHarness />);

    expect(screen.getByLabelText('Research group')).toHaveValue(
      'Klinik Sehat Jiwa'
    );
    expect(screen.getByLabelText(/research question/i)).toBeInTheDocument();
    expect(screen.getByText('Ethics status')).toBeInTheDocument();
  });

  it('renders no metadata fields outside a metadata provider', () => {
    renderWithQuery(<Step1 register={mockRegister()} errors={{}} />);

    expect(screen.queryByLabelText('Research group')).not.toBeInTheDocument();
  });
});

describe('submitStudy', () => {
  const batches: FormData['batches'] = [
    {
      startDate: '2024-01-01',
      endDate: '2024-02-01',
      questionnaireIds: ['q1']
    },
    {
      startDate: '2024-03-01',
      endDate: '2024-04-01',
      questionnaireIds: ['q2']
    },
    {
      startDate: '2024-05-01',
      endDate: '2024-06-01',
      questionnaireIds: ['q3']
    }
  ];

  it('creates PlanDefinitions concurrently with index-derived titles and preserves batch order', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let planCallCount = 0;

    const post = vi.fn<
      (
        url: string,
        body: Record<string, unknown>
      ) => Promise<{ data: { id: string } }>
    >(async (url: string) => {
      if (url === '/fhir/PlanDefinition') {
        planCallCount += 1;
        const callIndex = planCallCount;
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        // Later calls resolve earlier: only index-mapped results keep batch order
        await new Promise(resolve => setTimeout(resolve, (4 - callIndex) * 5));
        inFlight -= 1;
        return { data: { id: `plan-${callIndex}` } };
      }
      return { data: { id: 'study-1' } };
    });

    const API = { post } as unknown as Parameters<typeof submitStudy>[0];
    const router = {
      push: vi.fn()
    } as unknown as Parameters<typeof submitStudy>[1]['router'];
    const data: FormData = {
      title: 'My Study',
      description: 'Study description',
      batches
    };
    const storageKey = 'research-form-test-user';
    localStorage.setItem(storageKey, 'stale data');

    await submitStudy(API, {
      data,
      userId: 'test-user',
      storageKey,
      router,
      tToast: key => key
    });

    // All PlanDefinition POSTs are issued before any resolves (Promise.all)
    expect(maxInFlight).toBeGreaterThan(1);

    const planPosts = post.mock.calls.filter(
      ([url]) => url === '/fhir/PlanDefinition'
    );
    expect(planPosts).toHaveLength(3);
    expect(planPosts.map(([, body]) => body.title as string)).toEqual([
      'Batch 1',
      'Batch 2',
      'Batch 3'
    ]);

    const studyPosts = post.mock.calls.filter(
      ([url]) => url === '/fhir/ResearchStudy'
    );
    expect(studyPosts).toHaveLength(1);
    const studyBody = studyPosts[0][1];
    expect(
      (studyBody.protocol as Array<{ reference: string }>).map(p => p.reference)
    ).toEqual([
      'PlanDefinition/plan-1',
      'PlanDefinition/plan-2',
      'PlanDefinition/plan-3'
    ]);

    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('research_create_success');
    expect(router.push).toHaveBeenCalledWith('/');
  });

  it('posts a ResearchStudy with the target participants extension', async () => {
    const post = vi.fn<
      (
        url: string,
        body: Record<string, unknown>
      ) => Promise<{ data: { id: string } }>
    >(async (url: string) =>
      url === '/fhir/PlanDefinition'
        ? { data: { id: 'plan-1' } }
        : { data: { id: 'study-1' } }
    );
    const API = { post } as unknown as Parameters<typeof submitStudy>[0];
    const router = {
      push: vi.fn()
    } as unknown as Parameters<typeof submitStudy>[1]['router'];
    const data: FormData = {
      title: 'My Study',
      description: 'Study description',
      targetParticipants: 120,
      batches: [
        {
          startDate: '2024-01-01',
          endDate: '2024-02-01',
          questionnaireIds: ['q1']
        }
      ]
    };

    await submitStudy(API, {
      data,
      userId: 'test-user',
      storageKey: 'research-form-target-test-user',
      router,
      tToast: key => key
    });

    const studyPosts = post.mock.calls.filter(
      ([url]) => url === '/fhir/ResearchStudy'
    );
    expect(studyPosts).toHaveLength(1);
    const studyBody = studyPosts[0][1];
    const extension = (
      studyBody.extension as Array<{
        url: string;
        valuePositiveInt?: number;
      }>
    ).find(
      item =>
        item.url ===
        'http://konsulin.care/fhir/StructureDefinition/researchTargetParticipants'
    );
    expect(extension?.valuePositiveInt).toBe(120);
  });

  it('posts the metadata, lead name and sponsor with its display', async () => {
    const post = vi.fn<
      (
        url: string,
        body: Record<string, unknown>
      ) => Promise<{ data: { id: string } }>
    >(async (url: string) =>
      url === '/fhir/PlanDefinition'
        ? { data: { id: 'plan-1' } }
        : { data: { id: 'study-1' } }
    );
    const API = { post } as unknown as Parameters<typeof submitStudy>[0];
    const router = {
      push: vi.fn()
    } as unknown as Parameters<typeof submitStudy>[1]['router'];
    const data: FormData = {
      title: 'My Study',
      description: 'Study description',
      researchQuestion: 'Does sleep help?',
      whoCanJoin: 'Adults 18+',
      ethicsStatus: 'approved',
      ethicsReference: 'EC-42',
      sharesFindings: true,
      batches: [
        {
          startDate: '2024-01-01',
          endDate: '2024-02-01',
          questionnaireIds: ['q1']
        }
      ]
    };

    await submitStudy(API, {
      data,
      userId: 'test-user',
      storageKey: 'research-form-metadata-test-user',
      router,
      tToast: key => key,
      organizationId: 'org-1',
      organizationName: 'Klinik Sehat Jiwa',
      leadName: 'Dr. Lead'
    });

    const studyPosts = post.mock.calls.filter(
      ([url]) => url === '/fhir/ResearchStudy'
    );
    expect(studyPosts).toHaveLength(1);
    const body = studyPosts[0][1];
    const study = body as unknown as ResearchStudy;

    expect(study.objective?.[0]?.name).toBe('Does sleep help?');
    expect(study.principalInvestigator?.display).toBe('Dr. Lead');
    expect(study.sponsor).toEqual({
      reference: 'Organization/org-1',
      display: 'Klinik Sehat Jiwa'
    });
    expect(getEthicsStatus(study)).toEqual({
      code: 'approved',
      reference: 'EC-42'
    });
    expect(getWhoCanJoin(study)).toBe('Adults 18+');
    expect(getSharesFindings(study)).toBe(true);
  });

  it('posts no sponsor when the researcher has no organization', async () => {
    const post = vi.fn<
      (
        url: string,
        body: Record<string, unknown>
      ) => Promise<{ data: { id: string } }>
    >(async (url: string) =>
      url === '/fhir/PlanDefinition'
        ? { data: { id: 'plan-1' } }
        : { data: { id: 'study-1' } }
    );
    const API = { post } as unknown as Parameters<typeof submitStudy>[0];
    const router = {
      push: vi.fn()
    } as unknown as Parameters<typeof submitStudy>[1]['router'];
    const data: FormData = {
      title: 'My Study',
      researchQuestion: 'Does sleep help?',
      ethicsStatus: 'applying',
      sharesFindings: false,
      batches: [
        {
          startDate: '2024-01-01',
          endDate: '2024-02-01',
          questionnaireIds: ['q1']
        }
      ]
    };

    await submitStudy(API, {
      data,
      userId: 'test-user',
      storageKey: 'research-form-no-org-test-user',
      router,
      tToast: key => key,
      leadName: 'Dr. Solo'
    });

    const studyPosts = post.mock.calls.filter(
      ([url]) => url === '/fhir/ResearchStudy'
    );
    expect(studyPosts).toHaveLength(1);
    expect(studyPosts[0][1].sponsor).toBeUndefined();
  });
});
