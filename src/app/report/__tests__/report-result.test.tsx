import { render, screen, within } from '@testing-library/react';
import type { QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  const { default: interpretation } =
    await import('@/messages/en/interpretation.json');
  const base = createUseTranslationsMock();

  /** Resolves a dotted key against the interpretation message tree. */
  const readKey = (key: string): string => {
    let node: unknown = interpretation;
    for (const part of key.split('.')) {
      if (!node || typeof node !== 'object') return key;
      node = (node as Record<string, unknown>)[part];
    }
    return typeof node === 'string' ? node : key;
  };

  return {
    useTranslations: (namespace?: string) => {
      const translate = base(namespace);
      return namespace === 'interpretation' ? readKey : translate;
    }
  };
});

import { INSTRUMENT_SYSTEM } from '@/lib/interpretation';

import { ReportResult, type ReportResultItem } from '../report-result';

const PHQ_9 = { system: INSTRUMENT_SYSTEM, code: 'phq-9' } as const;
const OLBI = { system: INSTRUMENT_SYSTEM, code: 'olbi' } as const;

/**
 * Builds a response with score-dimension items, an optional reference and
 * optional signal items.
 *
 * @param dimensions - linkId, raw value and display text per dimension.
 * @param options - Reference maximum and signal values.
 * @returns A minimal completed QuestionnaireResponse.
 */
function makeResponse(
  dimensions: ReadonlyArray<{
    linkId: string;
    value: number;
    text?: string;
  }>,
  options: {
    reference?: number;
    signals?: ReadonlyArray<{ linkId: string; value: number }>;
  } = {}
): QuestionnaireResponse {
  const scoreItems = dimensions.map(dimension => ({
    linkId: dimension.linkId,
    text: dimension.text,
    answer: [{ valueInteger: dimension.value }]
  }));
  const referenceItem =
    options.reference === undefined
      ? []
      : [
          {
            linkId: 'reference',
            answer: [{ valueInteger: options.reference }]
          }
        ];
  const signalItems = (options.signals ?? []).map(signal => ({
    linkId: signal.linkId,
    answer: [{ valueInteger: signal.value }]
  }));

  return {
    resourceType: 'QuestionnaireResponse',
    status: 'completed',
    item: [
      {
        linkId: 'interpretation',
        item: [
          {
            linkId: 'score-dimension',
            item: [...referenceItem, ...scoreItems]
          },
          { linkId: 'signal', item: signalItems }
        ]
      }
    ]
  };
}

/** Finds the rendered section for one questionnaire id. */
function sectionFor(questionnaireId: string): HTMLElement {
  const section = screen
    .getAllByTestId('report-result')
    .find(
      item => item.getAttribute('data-questionnaire-id') === questionnaireId
    );
  if (!section) throw new Error(`Missing section for ${questionnaireId}`);
  return section;
}

/** Builds a report item with a known instrument by default. */
function makeItem(overrides: Partial<ReportResultItem> = {}): ReportResultItem {
  return {
    questionnaireId: 'phq-9',
    title: 'PHQ-9',
    response: makeResponse([{ linkId: 'total', value: 0 }], { reference: 27 }),
    instrument: PHQ_9,
    ...overrides
  };
}

describe('ReportResult', () => {
  it('renders the raw score, the localized reference and a zero-width bar for a zero score', () => {
    render(<ReportResult items={[makeItem()]} />);
    const section = sectionFor('phq-9');

    expect(
      within(section).getByTestId('report-result-score')
    ).toHaveTextContent('0');
    expect(within(section).getByTestId('report-result-of')).toHaveTextContent(
      'of 27'
    );
    const bar = within(section).getByTestId('report-result-bar');
    expect(bar).toHaveAttribute('data-fraction', '0');
    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('renders band copy, the combined reading, notes and the self-harm alert for known instruments', () => {
    render(
      <ReportResult
        items={[
          makeItem({
            response: makeResponse([{ linkId: 'total', value: 5 }], {
              reference: 27,
              signals: [{ linkId: 'self-harm', value: 2 }]
            })
          }),
          makeItem({
            questionnaireId: 'olbi',
            title: 'OLBI',
            instrument: OLBI,
            response: makeResponse(
              [
                { linkId: 'exhaustion', value: 1 },
                { linkId: 'disengagement', value: 1 }
              ],
              { reference: 4 }
            )
          })
        ]}
      />
    );

    const phq = sectionFor('phq-9');
    expect(within(phq).getByTestId('report-result-reading')).toHaveTextContent(
      'Mild symptoms'
    );
    expect(within(phq).getByTestId('report-result-flag')).toHaveTextContent(
      'You deserve support'
    );
    expect(within(phq).getByRole('alert')).toBeVisible();
    expect(within(phq).getByTestId('report-result-note')).toHaveTextContent(
      'Scores below 10'
    );

    const olbi = sectionFor('olbi');
    expect(
      within(olbi).getByTestId('report-result-combined')
    ).toHaveTextContent('No signs of burnout');
    expect(within(olbi).getByTestId('report-result-note')).toHaveTextContent(
      'assuming you are currently working'
    );
  });

  it('falls back to the item text and shows no reading when the instrument is unknown', () => {
    render(
      <ReportResult
        items={[
          makeItem({
            instrument: null,
            response: makeResponse(
              [{ linkId: 'total', value: 7, text: 'Mood' }],
              { reference: 27 }
            )
          })
        ]}
      />
    );
    const section = sectionFor('phq-9');

    expect(within(section).getByText('Mood')).toBeInTheDocument();
    expect(
      within(section).getByTestId('report-result-score')
    ).toHaveTextContent('7');
    expect(within(section).getByTestId('report-result-of')).toHaveTextContent(
      'of 27'
    );
    expect(within(section).queryByTestId('report-result-reading')).toBeNull();
    expect(within(section).queryByTestId('report-result-flag')).toBeNull();
    expect(within(section).queryByTestId('report-result-note')).toBeNull();
  });
});
