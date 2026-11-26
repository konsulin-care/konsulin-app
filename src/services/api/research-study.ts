import type { StudyProgress } from '@/utils/fhir/research';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getAPI } from '../api';
import { fetchStudiesByIds } from './research-catalogue';

/**
 * Loads one study with its batches, whatever its status.
 *
 * @param id - ResearchStudy id; the query is disabled when empty.
 * @returns React Query result; data is null when the study is not found.
 */
export function useStudyById(id: string): UseQueryResult<StudyProgress | null> {
  return useQuery<StudyProgress | null>({
    queryKey: ['research-study', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const API = await getAPI();
      const today = format(new Date(), 'yyyy-MM-dd');
      const found = await fetchStudiesByIds(API, [id], today);
      return found[0] ?? null;
    }
  });
}
