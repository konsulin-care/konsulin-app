import { getAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

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
      const response = await API.get(`/fhir/Media`);
      return response;
    },
    select: (response): ExerciseItem[] => {
      const entries = response.data.entry || [];

      return entries.map(
        (entry: {
          resource: ExerciseItem & {
            content?: { url?: string; title?: string };
            note?: Array<{ text: string }>;
          };
        }) => {
          const resource = entry.resource;

          return {
            id: resource.id,
            url: resource.content?.url ?? '',
            title: resource.content?.title ?? '',
            duration: resource.duration
              ? Math.floor(resource.duration / 60)
              : 0,
            description: resource.note
              ? (resource.note as Array<{ text: string }>)
                  .map(n => n.text)
                  .join(' ')
              : ''
          };
        }
      );
    }
  });
};
