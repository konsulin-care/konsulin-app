import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/not-found', () => ({
  default: () => <div data-testid='mock-notfound'>Not Found</div>
}));

vi.mock('@/app/record/record-assessment', () => ({
  default: () => <div data-testid='mock-record-assessment'>Assessment</div>
}));

vi.mock('@/app/record/record-soap', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid='mock-record-soap'>
      SOAP
      {typeof props.onPractitionerNameChange === 'function' && (
        <span data-testid='practitioner-name-callback'>has-callback</span>
      )}
    </div>
  )
}));

vi.mock('@/app/record/record-journal', () => ({
  default: () => <div data-testid='mock-record-journal'>Journal</div>
}));

vi.mock('@/app/record/record-condition', () => ({
  default: () => <div data-testid='mock-record-condition'>Condition</div>
}));

import {
  conditionTitle,
  observationTitle,
  questionnaireResponseTitle,
  renderCondition,
  renderObservation,
  renderQuestionnaireResponse
} from '../record-renderers';

describe('title resolvers', () => {
  it('conditionTitle returns "Condition Detail"', () => {
    expect(conditionTitle()).toBe('Condition Detail');
  });

  it('questionnaireResponseTitle returns "SOAP Detail" for SOAP notes', () => {
    expect(
      questionnaireResponseTitle({
        questionnaire: 'Questionnaire/soap'
      })
    ).toBe('SOAP Detail');
  });

  it('questionnaireResponseTitle returns "Assessment Result" for non-SOAP', () => {
    expect(
      questionnaireResponseTitle({
        questionnaire: 'Questionnaire/phq9'
      })
    ).toBe('Assessment Result');
  });

  it('observationTitle returns "Journal Detail" for LOINC 51855-5', () => {
    expect(
      observationTitle({
        code: {
          coding: [{ system: 'https://loinc.org', code: '51855-5' }]
        }
      })
    ).toBe('Journal Detail');
  });

  it('observationTitle returns "SOAP Detail" for LOINC 67855-7', () => {
    expect(
      observationTitle({
        code: {
          coding: [{ system: 'https://loinc.org', code: '67855-7' }]
        }
      })
    ).toBe('SOAP Detail');
  });

  it('observationTitle returns "Detail" for other Observations', () => {
    expect(
      observationTitle({
        code: {
          coding: [{ system: 'https://loinc.org', code: '12345-6' }]
        }
      })
    ).toBe('Detail');
  });
});

describe('renderer functions', () => {
  it('renderCondition renders RecordCondition with correct id', () => {
    render(renderCondition({ resourceId: 'cond-1' }));
    expect(screen.getByTestId('mock-record-condition')).toBeInTheDocument();
  });

  it('renderQuestionnaireResponse renders RecordSoap for SOAP notes', () => {
    render(
      renderQuestionnaireResponse({
        resourceId: 'qr-1',
        data: { questionnaire: 'Questionnaire/soap' }
      })
    );
    expect(screen.getByTestId('mock-record-soap')).toBeInTheDocument();
  });

  it('renderQuestionnaireResponse renders RecordAssessment for non-SOAP', () => {
    render(
      renderQuestionnaireResponse({
        resourceId: 'qr-1',
        data: { questionnaire: 'Questionnaire/phq9' }
      })
    );
    expect(screen.getByTestId('mock-record-assessment')).toBeInTheDocument();
  });

  it('renderObservation renders RecordJournal for LOINC 51855-5', () => {
    render(
      renderObservation({
        resourceId: 'obs-1',
        data: {
          code: {
            coding: [{ system: 'https://loinc.org', code: '51855-5' }]
          }
        }
      })
    );
    expect(screen.getByTestId('mock-record-journal')).toBeInTheDocument();
  });

  it('renderObservation renders RecordSoap for LOINC 67855-7', () => {
    render(
      renderObservation({
        resourceId: 'obs-2',
        data: {
          code: {
            coding: [{ system: 'https://loinc.org', code: '67855-7' }]
          }
        }
      })
    );
    expect(screen.getByTestId('mock-record-soap')).toBeInTheDocument();
  });

  it('renderObservation renders Notfound for unknown Observation', () => {
    render(
      renderObservation({
        resourceId: 'obs-3',
        data: {
          code: {
            coding: [{ system: 'https://loinc.org', code: '12345-6' }]
          }
        }
      })
    );
    expect(screen.getByTestId('mock-notfound')).toBeInTheDocument();
  });

  it('passes onPractitionerNameChange to RecordSoap for Practitioner Note', () => {
    render(
      renderObservation({
        resourceId: 'obs-2',
        data: {
          code: {
            coding: [{ system: 'https://loinc.org', code: '67855-7' }]
          }
        },
        onPractitionerNameChange: vi.fn()
      })
    );
    expect(
      screen.getByTestId('practitioner-name-callback')
    ).toBeInTheDocument();
  });
});
