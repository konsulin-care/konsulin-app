import type { ResearchProgress } from '@/utils/fhir/research';
import type { QueryClient } from '@tanstack/react-query';
import { questionnaireQueryOptions } from './assessment';

/**
 * Prefetches the questionnaires of every study's current batch that the user
 * has not completed yet. Runs only while the browser reports an online
 * connection, so the service worker can cache the Questionnaire GETs.
 *
 * @param client - TanStack Query client used for prefetching.
 * @param progress - Full research progress containing studies and batches.
 * @returns A promise that settles when all prefetches settle.
 */
export async function prefetchCurrentBatchQuestionnaires(
  client: QueryClient,
  progress: ResearchProgress
): Promise<void> {
  if (!navigator.onLine) return;

  const prefetches: Promise<unknown>[] = [];
  for (const study of progress.studies) {
    const batch = study.currentBatch;
    if (!batch) continue;

    for (const questionnaireId of batch.questionnaireIds) {
      if (study.completedQuestionnaireIds.includes(questionnaireId)) continue;
      prefetches.push(
        client.query(questionnaireQueryOptions(questionnaireId)).catch(() => {
          /* prefetch is best-effort; failures surface on real use */
        })
      );
    }
  }

  await Promise.all(prefetches);
}
