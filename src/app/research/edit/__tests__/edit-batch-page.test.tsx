import {
  createQueryClient,
  renderWithQuery
} from '@/__tests__/react-test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { useSearchParams } from 'next/navigation';
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Step3 } from '../../register/research-form-steps';
import type { FormData } from '../form-defaults';
import EditResearchForm from '../research-form';

vi.mock('@/i18n', async () =>
  (await import('@/__tests__/mocks/i18n-mock')).i18nMockFactory()
);

vi.mock('@/context/auth/authContext', async () => ({
  ...(await import('@/__tests__/mocks/research-form')).researcherAuthMock
}));

vi.mock('@/services/api', async () =>
  (await import('@/__tests__/mocks/research-form')).researchApiMockFactory()
);

vi.mock('next/navigation', async () => ({
  ...(await import('@/__tests__/mocks/research-form')).researchRouterMock,
  usePathname: () => '/research/edit',
  useSearchParams: vi.fn()
}));

const mockStudy: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'DIE4YHFLLK3VGOIR',
  title: 'Living with low mood',
  description: 'A study about low mood',
  status: 'active',
  protocol: [
    { reference: 'PlanDefinition/plan-1' },
    { reference: 'PlanDefinition/plan-2' },
    { reference: 'PlanDefinition/plan-3' }
  ]
};

const mockPlanDefinitions: PlanDefinition[] = [
  {
    resourceType: 'PlanDefinition',
    id: 'plan-1',
    title: 'Batch 1',
    status: 'active',
    effectivePeriod: { start: '2026-09-01', end: '2026-10-01' },
    action: [
      { definitionCanonical: 'Questionnaire/gad7' },
      { definitionCanonical: 'Questionnaire/snomed' }
    ]
  },
  {
    resourceType: 'PlanDefinition',
    id: 'plan-2',
    title: 'Batch 2',
    status: 'active',
    effectivePeriod: { start: '2026-10-01', end: '2026-10-30' },
    action: [{ definitionCanonical: 'Questionnaire/big-five-inventory' }]
  },
  {
    resourceType: 'PlanDefinition',
    id: 'plan-3',
    title: 'Batch 3',
    status: 'active',
    effectivePeriod: { start: '2026-10-31', end: '2026-11-29' },
    action: [{ definitionCanonical: 'Questionnaire/gad7' }]
  }
];

/** Point the mocked `useSearchParams` at a query string. */
function setSearch(search: string): void {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(search) as unknown as ReturnType<typeof useSearchParams>
  );
}

describe('EditResearchForm - batch page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.setSystemTime(new Date('2026-11-27T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the batch page with three locked batch cards', () => {
    setSearch('id=DIE4YHFLLK3VGOIR&page=batch');

    expect(() =>
      renderWithQuery(
        <EditResearchForm
          study={mockStudy}
          planDefinitions={mockPlanDefinitions}
        />
      )
    ).not.toThrow();

    expect(screen.getAllByText('Batch 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Batch 2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Batch 3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('(locked)')).toHaveLength(3);
  });

  it('keeps the batch rows aligned when navigating back to the batch page', () => {
    const client = createQueryClient();
    setSearch('id=DIE4YHFLLK3VGOIR&page=title');

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <EditResearchForm
          study={mockStudy}
          planDefinitions={mockPlanDefinitions}
        />
      </QueryClientProvider>
    );

    setSearch('id=DIE4YHFLLK3VGOIR&page=questionnaire');
    rerender(
      <QueryClientProvider client={client}>
        <EditResearchForm
          study={mockStudy}
          planDefinitions={mockPlanDefinitions}
        />
      </QueryClientProvider>
    );

    setSearch('id=DIE4YHFLLK3VGOIR&page=batch');
    expect(() =>
      rerender(
        <QueryClientProvider client={client}>
          <EditResearchForm
            study={mockStudy}
            planDefinitions={mockPlanDefinitions}
          />
        </QueryClientProvider>
      )
    ).not.toThrow();

    expect(screen.getAllByText('01 Sep 2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('01 Oct 2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('31 Oct 2026').length).toBeGreaterThanOrEqual(1);
  });
});

describe('Step3 - batch rows', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a batch card from the field-array row when batches lacks the index', () => {
    const fields: FieldArrayWithId<FormData, 'batches'>[] = [
      {
        id: 'row-1',
        startDate: '2026-09-01',
        endDate: '2026-10-01',
        questionnaireIds: []
      }
    ];
    // @type an empty watched array exercises the field-row fallback path
    const setValue = vi.fn() as unknown as UseFormReturn<FormData>['setValue'];

    expect(() =>
      renderWithQuery(
        <Step3
          fields={fields}
          errors={{}}
          batches={[]}
          setValue={setValue}
          onAddBatch={vi.fn()}
          onRemoveBatch={vi.fn()}
        />
      )
    ).not.toThrow();

    expect(screen.getByText('Batch 1')).toBeInTheDocument();
    expect(screen.getByText('01 Sep 2026')).toBeInTheDocument();
    expect(screen.getByText('01 Oct 2026')).toBeInTheDocument();
  });
});
