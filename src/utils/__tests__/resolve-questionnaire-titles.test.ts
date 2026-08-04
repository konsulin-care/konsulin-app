import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveQuestionnaireTitles } from '../resolve-questionnaire-titles';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxios = { get: vi.fn() };

describe('resolveQuestionnaireTitles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('resolves titles for records whose questionnaire is a canonical url', async () => {
    mockAxios.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              resourceType: 'Questionnaire',
              id: 'phq2',
              title: 'PHQ-2'
            }
          }
        ]
      }
    });

    const queryClient = new QueryClient();
    const records = [
      {
        type: 'QuestionnaireResponse',
        resourceType: 'QuestionnaireResponse',
        id: 'QR/phq2-x',
        title: 'https://konsulin.care/fhir/Questionnaire/phq2',
        result: '',
        lastUpdated: '2024-01-01T00:00:00Z'
      }
    ];

    const result = await resolveQuestionnaireTitles(records, { queryClient });

    expect(result[0].title).toBe('PHQ-2');
    expect(mockAxios.get).toHaveBeenCalledWith(
      '/fhir/Questionnaire?_id=phq2&_elements=title',
      expect.anything()
    );
  });

  it('leaves non-reference display titles untouched and skips the fetch', async () => {
    const queryClient = new QueryClient();
    const records = [
      {
        type: 'QuestionnaireResponse',
        resourceType: 'QuestionnaireResponse',
        id: 'QR/phq2-y',
        title: 'PHQ-2 Depression Screener',
        result: '',
        lastUpdated: '2024-01-01T00:00:00Z'
      }
    ];

    const result = await resolveQuestionnaireTitles(records, { queryClient });

    expect(result[0].title).toBe('PHQ-2 Depression Screener');
    expect(mockAxios.get).not.toHaveBeenCalled();
  });
});
