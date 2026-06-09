import { StoreName, dbSet } from '@/lib/indexeddb';
import { getResponse } from '@aehrc/smart-forms-renderer';
import { QuestionnaireResponse } from 'fhir/r4';

/**
 *
 */
export function useDraftAutoSave(
  storeName: StoreName,
  buildData: (response: QuestionnaireResponse) => Record<string, unknown>
): () => void {
  return () => {
    setTimeout(() => {
      const qr = getResponse();
      if (!qr) return;
      dbSet(storeName, buildData(qr)).catch((err: unknown) =>
        console.warn('[IndexedDB]', err)
      );
    }, 300);
  };
}
