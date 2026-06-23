import { getAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Bundle } from 'fhir/r4';

type ExerciseItem = {
  id: string;
  url: string;
  title: string;
  duration: number;
  description: string;
};

export const useGetExercise = () => {
  return useQuery({
    queryKey: ['exercise'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(`/fhir/Media`);
      return response;
    },
    select: (response): ExerciseItem[] => {
      const entries = response.data.entry ?? [];

      return entries.map(entry => {
        const resource = entry.resource as unknown as ExerciseItem & {
          content?: { url?: string; title?: string };
          note?: Array<{ text: string }>;
        };

        return {
          id: resource.id,
          url: resource.content?.url ?? '',
          title: resource.content?.title ?? '',
          duration: resource.duration ? Math.floor(resource.duration / 60) : 0,
          description: resource.note
            ? resource.note.map(n => n.text).join(' ')
            : ''
        };
      });
    }
  });
};
