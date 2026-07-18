/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useRecordDetail', () => ({
  useRecordDetail: vi.fn()
}));

vi.mock('@/app/not-found', () => ({
  default: () => <div data-testid='mock-notfound'>Not Found</div>
}));

vi.mock('@/app/record/record-assessment', () => ({
  default: () => <div data-testid='mock-record-assessment'>Assessment</div>
}));

vi.mock('@/app/record/record-soap', () => ({
  default: () => <div data-testid='mock-record-soap'>SOAP</div>
}));

vi.mock('@/app/record/record-journal', () => ({
  default: () => <div data-testid='mock-record-journal'>Journal</div>
}));

import { useRecordDetail } from '@/hooks/useRecordDetail';
import RecordDetail from '../record-detail';

describe('RecordDetail - dispatches by resourceType + content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders RecordAssessment for non-SOAP QuestionnaireResponse', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'QuestionnaireResponse',
        id: 'qr-1',
        questionnaire: 'Questionnaire/phq9'
      },
      isLoading: false,
      error: null
    } as any);

    render(
      <RecordDetail
        resourceType='QuestionnaireResponse'
        resourceId='qr-1'
        title='PHQ-9'
      />
    );
    expect(screen.getByTestId('mock-record-assessment')).toBeInTheDocument();
  });

  it('renders RecordSoap for SOAP QuestionnaireResponse', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'QuestionnaireResponse',
        id: 'qr-1',
        questionnaire: 'Questionnaire/soap'
      },
      isLoading: false,
      error: null
    } as any);

    render(
      <RecordDetail
        resourceType='QuestionnaireResponse'
        resourceId='qr-1'
        title='SOAP Note'
      />
    );
    expect(screen.getByTestId('mock-record-soap')).toBeInTheDocument();
  });

  it('renders RecordJournal for Observation LOINC 51855-5', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-1',
        code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] }
      },
      isLoading: false,
      error: null
    } as any);

    render(
      <RecordDetail
        resourceType='Observation'
        resourceId='obs-1'
        title='Journal'
      />
    );
    expect(screen.getByTestId('mock-record-journal')).toBeInTheDocument();
  });

  it('renders RecordSoap for Observation LOINC 67855-7', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'obs-2',
        code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] }
      },
      isLoading: false,
      error: null
    } as any);

    render(
      <RecordDetail
        resourceType='Observation'
        resourceId='obs-2'
        title='Note'
      />
    );
    expect(screen.getByTestId('mock-record-soap')).toBeInTheDocument();
  });

  it('renders Notfound for unknown resourceType', () => {
    vi.mocked(useRecordDetail).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as any);

    render(
      <RecordDetail resourceType='UnknownType' resourceId='x' title='Test' />
    );
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('renders Notfound when resourceId is empty', () => {
    render(
      <RecordDetail resourceType='Observation' resourceId='' title='Test' />
    );
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });
});
