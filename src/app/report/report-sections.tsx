'use client';

import { useTranslations } from '@/i18n';
import type { QuestionnaireInfo } from '@/services/api/research';
import { questionnaireIdLabel } from '@/utils/fhir/questionnaire-url';
import { batchLabel, trendForQuestionnaire } from '@/utils/fhir/report';
import type { ResearchBatch } from '@/utils/fhir/research';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import { nextBatchWithQuestionnaire } from '@/utils/fhir/research-schedule';
import type { QuestionnaireResponse } from 'fhir/r4';

import { batchTitle, sharedAuthoredDate } from './batch-meta';
import { QuestionnaireCard } from './questionnaire-card';

/** One reverse-chronological batch section: header plus questionnaire cards. */
export function BatchSection({
  batch,
  sortedBatches,
  responses,
  titleMap,
  buckets,
  latestBatchByQuestionnaire
}: Readonly<{
  batch: ResearchBatch;
  sortedBatches: readonly ResearchBatch[];
  responses: readonly QuestionnaireResponse[];
  titleMap: ReadonlyMap<string, QuestionnaireInfo>;
  buckets: ReadonlyMap<string, readonly QuestionnaireResponse[]>;
  latestBatchByQuestionnaire: ReadonlyMap<string, string>;
}>) {
  const t = useTranslations('common');
  const sharedDate = sharedAuthoredDate(responses);
  const prefix = (index: number): string => t('report.batch_prefix', { index });

  return (
    <section
      data-testid='report-batch-section'
      data-batch-id={batch.id}
      className='mb-5'
    >
      <div data-testid='report-batch-header' className='mb-2'>
        <p className='text-foreground text-sm font-bold'>
          {batchTitle(batch, sortedBatches, prefix)}
        </p>
        {sharedDate && (
          <p className='text-muted-foreground text-xs'>
            {t('report.completed_at', { date: sharedDate })}
          </p>
        )}
      </div>

      <div className='space-y-2'>
        {responses.map(response => {
          const questionnaireId = extractQuestionnaireId(
            response.questionnaire
          );
          if (!questionnaireId) return null;
          const trend = trendForQuestionnaire(
            questionnaireId,
            buckets,
            sortedBatches,
            prefix
          );
          const compareBatch = nextBatchWithQuestionnaire(
            sortedBatches,
            questionnaireId,
            batch.start
          );
          return (
            <QuestionnaireCard
              key={response.id}
              questionnaireId={questionnaireId}
              title={
                titleMap.get(questionnaireId)?.title ??
                questionnaireIdLabel(questionnaireId)
              }
              response={response}
              batchId={batch.id}
              latestBatchId={latestBatchByQuestionnaire.get(questionnaireId)}
              trend={trend}
              hideAuthored={sharedDate !== null}
              baselineCompareLabel={
                compareBatch
                  ? batchLabel(compareBatch, sortedBatches, prefix)
                  : null
              }
            />
          );
        })}
      </div>
    </section>
  );
}
