import { renderWithQuery } from '@/__tests__/react-test-utils';
import {
  setEthicsStatus,
  setSharesFindings,
  setWhoCanJoin
} from '@/utils/fhir/study-metadata';
import { screen } from '@testing-library/react';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditResearchForm from '../research-form';

vi.mock('@/i18n', async () =>
  (await import('@/__tests__/mocks/i18n-mock')).i18nMockFactory()
);

vi.mock('@/context/auth/authContext', async () => ({
  ...(await import('@/__tests__/mocks/research-form')).researcherAuthMock
}));

vi.mock('@/services/api', () => ({
  getAPI: () =>
    Promise.resolve({
      get: vi.fn().mockResolvedValue({
        data: { entry: [{ resource: { id: 'phq9', title: 'PHQ-9' } }] }
      }),
      post: vi.fn().mockResolvedValue({ data: { id: 'new-id' } })
    })
}));

vi.mock('next/navigation', async () => ({
  ...(await import('@/__tests__/mocks/research-form')).researchRouterMock,
  usePathname: () => '/research/edit',
  useSearchParams: vi.fn()
}));

const baseStudy: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'study-1',
  title: 'Sleep Study',
  description: 'A study about sleep',
  status: 'active',
  principalInvestigator: { display: 'Dr A' },
  objective: [{ name: 'Does sleep help?' }]
};

const studyWithMetadata = setSharesFindings(
  setEthicsStatus(setWhoCanJoin(baseStudy, 'Adults 18+'), {
    code: 'approved',
    reference: 'EC-42'
  }),
  true
);

const planDefinitions: PlanDefinition[] = [
  {
    resourceType: 'PlanDefinition',
    id: 'plan-1',
    status: 'active',
    effectivePeriod: { start: '2026-01-01', end: '2026-12-31' },
    action: [{ definitionCanonical: 'Questionnaire/phq9' }]
  }
];

/** Points the edit form at the title step of the study. */
function renderTitleStep(study: ResearchStudy): void {
  renderWithQuery(
    <EditResearchForm study={study} planDefinitions={planDefinitions} />
  );
}

describe('Edit form study metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=study-1&page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );
  });

  it('prefills question, who can join, ethics and findings from the study', () => {
    renderTitleStep(studyWithMetadata);

    expect(
      screen.getByLabelText(
        'Research question. One sentence, in everyday words.'
      )
    ).toHaveValue('Does sleep help?');
    expect(
      screen.getByLabelText(
        'Who can join (optional). For example: adults aged 18 and over'
      )
    ).toHaveValue('Adults 18+');
    expect(
      screen.getByRole('radio', { name: 'Approved by an ethics committee' })
    ).toBeChecked();
    expect(screen.getByLabelText('Approval reference (optional)')).toHaveValue(
      'EC-42'
    );
    expect(
      screen.getByRole('checkbox', {
        name: 'I will share the findings with participants in everyday language'
      })
    ).toBeChecked();
  });

  it('renders the metadata fields on the title step', () => {
    renderTitleStep(baseStudy);

    expect(screen.getByLabelText('Research group')).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'Research question. One sentence, in everyday words.'
      )
    ).toHaveValue('Does sleep help?');
    expect(
      screen.getByRole('radio', { name: 'Approval is being applied for' })
    ).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Exempt from review' })
    ).not.toBeChecked();
  });
});
