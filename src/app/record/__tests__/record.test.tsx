import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Mocks ----
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  usePathname: vi.fn(() => '/record'),
  useRouter: vi.fn(() => ({ back: vi.fn(), replace: vi.fn() }))
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: ReactNode }) => children
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/components/shared/record-card', () => ({
  default: ({ record }: { record: { type: string } }) => (
    <div data-testid='integration-record-card'>{record.type}</div>
  )
}));

vi.mock('@/app/record/record-assessment', () => ({
  default: () => <div data-testid='integ-assessment'>Assessment</div>
}));

vi.mock('@/app/record/record-soap', () => ({
  default: () => <div data-testid='integ-soap'>SOAP</div>
}));

vi.mock('@/app/record/record-journal', () => ({
  default: () => <div data-testid='integ-journal'>Journal</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import RecordPage from '../page';

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function mockBundleEntry(resources: Record<string, unknown>[]) {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: resources.map(r => ({ resource: r }))
  };
}

describe('Record page — integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Practitioner', fhirId: 'dr-1' }
      },
      isLoading: false
    });

    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: { resourceType: 'Bundle', type: 'searchset', entry: [] }
      })
    } as never);
  });

  it('1. renders all categories from mixed $everything Bundle', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=pat-1') as unknown as ReadonlyURLSearchParams
    );

    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: mockBundleEntry([
          {
            resourceType: 'Observation',
            id: 'obs-1',
            status: 'final',
            code: {
              coding: [{ system: 'https://loinc.org', code: '51855-5' }]
            },
            meta: { lastUpdated: '2024-06-01T00:00:00Z' }
          },
          {
            resourceType: 'QuestionnaireResponse',
            id: 'qr-1',
            status: 'completed',
            questionnaire: 'Questionnaire/phq9',
            subject: { reference: 'Patient/pat-1' },
            author: { reference: 'Patient/pat-1' },
            meta: { lastUpdated: '2024-06-02T00:00:00Z' }
          },
          {
            resourceType: 'Condition',
            id: 'cond-1',
            subject: { reference: 'Patient/pat-1' },
            code: { text: 'Hypertension' },
            clinicalStatus: { coding: [{ code: 'active' }] },
            meta: { lastUpdated: '2024-06-03T00:00:00Z' }
          }
        ])
      })
    } as never);

    render(
      <Wrapper>
        <RecordPage />
      </Wrapper>
    );

    const cards = await screen.findAllByTestId('integration-record-card');
    expect(cards).toHaveLength(3);
  });

  it('2. shows empty state when Bundle has no entries', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=pat-1') as unknown as ReadonlyURLSearchParams
    );

    render(
      <Wrapper>
        <RecordPage />
      </Wrapper>
    );

    const empty = await screen.findByText(/no records/i);
    expect(empty).toBeInTheDocument();
  });

  it('3. detail dispatches QuestionnaireResponse to RecordAssessment', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        'id=pat-1&view=QuestionnaireResponse/qr-1&title=PHQ-9'
      ) as unknown as ReadonlyURLSearchParams
    );

    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: {
          resourceType: 'QuestionnaireResponse',
          id: 'qr-1',
          questionnaire: 'Questionnaire/phq9'
        }
      })
    } as never);

    render(
      <Wrapper>
        <RecordPage />
      </Wrapper>
    );

    const assessment = await screen.findByTestId('integ-assessment');
    expect(assessment).toBeInTheDocument();
  });

  it('4. detail dispatches Observation LOINC 51855-5 to RecordJournal', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        'id=pat-1&view=Observation/obs-1&title=My+Journal'
      ) as unknown as ReadonlyURLSearchParams
    );

    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: {
          resourceType: 'Observation',
          id: 'obs-1',
          code: {
            coding: [{ system: 'https://loinc.org', code: '51855-5' }]
          }
        }
      })
    } as never);

    render(
      <Wrapper>
        <RecordPage />
      </Wrapper>
    );

    const journal = await screen.findByTestId('integ-journal');
    expect(journal).toBeInTheDocument();
  });

  it('5. detail dispatches Observation LOINC 67855-7 to RecordSoap', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(
        'id=pat-1&view=Observation/obs-2&title=Note'
      ) as unknown as ReadonlyURLSearchParams
    );

    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: {
          resourceType: 'Observation',
          id: 'obs-2',
          code: {
            coding: [{ system: 'https://loinc.org', code: '67855-7' }]
          }
        }
      })
    } as never);

    render(
      <Wrapper>
        <RecordPage />
      </Wrapper>
    );

    const soap = await screen.findByTestId('integ-soap');
    expect(soap).toBeInTheDocument();
  });

  it('6. pagination: no next page when Bundle has no link[rel=next]', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=pat-1') as unknown as ReadonlyURLSearchParams
    );

    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          type: 'searchset',
          entry: Array.from({ length: 12 }, (_, i) => ({
            resource: {
              resourceType: 'Observation',
              id: `obs-${i}`,
              status: 'final',
              code: {
                coding: [{ system: 'https://loinc.org', code: '51855-5' }]
              },
              meta: {
                lastUpdated: `2024-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`
              }
            }
          }))
        }
      })
    } as never);

    render(
      <Wrapper>
        <RecordPage />
      </Wrapper>
    );

    const cards = await screen.findAllByTestId('integration-record-card');
    expect(cards).toHaveLength(12);
  });

  it('7. practitioner timeline includes SOAP notes', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('id=pat-1') as unknown as ReadonlyURLSearchParams
    );

    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockResolvedValue({
        data: mockBundleEntry([
          {
            resourceType: 'QuestionnaireResponse',
            id: 'soap-1',
            status: 'completed',
            questionnaire: 'Questionnaire/soap',
            subject: { reference: 'Patient/pat-1' },
            author: { reference: 'Practitioner/dr-1' },
            meta: { lastUpdated: '2024-06-01T00:00:00Z' },
            item: [
              {
                linkId: 'subjective',
                text: 'Subjective',
                item: [
                  {
                    linkId: 'complaint',
                    text: 'Complaint',
                    answer: [{ valueString: 'Headache' }]
                  }
                ]
              }
            ]
          }
        ])
      })
    } as never);

    render(
      <Wrapper>
        <RecordPage />
      </Wrapper>
    );

    const cards = await screen.findAllByTestId('integration-record-card');
    expect(cards).toHaveLength(1);
  });
});
