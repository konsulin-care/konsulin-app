import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Bundle, ResearchStudy } from 'fhir/r4';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudyConflictError, usePostFinding } from '../research-findings';

const httpGet = vi.fn();
const httpPost = vi.fn();

vi.mock('../../api', () => ({
  getAPI: () => Promise.resolve({ get: httpGet, post: httpPost })
}));

const STUDY: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 's1',
  meta: { versionId: '7' },
  title: 'Sleep study',
  status: 'active',
  note: [{ text: 'Enrolment closed', time: '2026-01-01T08:00:00Z' }]
};

const INPUT = {
  studyId: 's1',
  text: 'Interim analysis shows improvement',
  time: '2026-02-01T09:00:00Z',
  authorReference: 'Practitioner/p1',
  authorDisplay: 'Dr. Ani',
  participantCount: 12
};

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function postedBundle(): Bundle {
  return httpPost.mock.calls[0][1] as Bundle;
}

function postedStudy(): ResearchStudy {
  return postedBundle().entry?.[0]?.resource as ResearchStudy;
}

describe('usePostFinding', () => {
  beforeEach(() => {
    httpGet.mockReset();
    httpPost.mockReset();
    httpGet.mockResolvedValue({ data: STUDY });
    httpPost.mockResolvedValue({ data: {} });
  });

  it('posts a transaction PUT with ifMatch from the study versionId', async () => {
    const { result } = renderHook(() => usePostFinding(), {
      wrapper: makeWrapper()
    });

    await result.current.mutateAsync(INPUT);

    expect(httpGet).toHaveBeenCalledWith('/fhir/ResearchStudy/s1');
    const bundle = postedBundle();
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry?.[0].request).toEqual({
      method: 'PUT',
      url: 'ResearchStudy/s1',
      ifMatch: 'W/"7"'
    });
    expect(httpPost.mock.calls[0][0]).toBe('/fhir');
  });

  it('appends a note carrying the text and participant count', async () => {
    const { result } = renderHook(() => usePostFinding(), {
      wrapper: makeWrapper()
    });

    await result.current.mutateAsync(INPUT);

    const notes = postedStudy().note ?? [];
    expect(notes).toHaveLength(2);
    expect(notes[0].text).toBe('Enrolment closed');
    expect(notes[1].text).toBe(INPUT.text);
    expect(notes[1].time).toBe(INPUT.time);
    expect(notes[1].authorReference?.reference).toBe('Practitioner/p1');
    expect(notes[1].extension).toEqual([
      {
        url: 'http://konsulin.care/fhir/StructureDefinition/findingParticipantCount',
        valueInteger: 12
      }
    ]);
  });

  it('rejects a 412 with a conflict error without retrying', async () => {
    httpPost.mockRejectedValue({ response: { status: 412 } });
    const { result } = renderHook(() => usePostFinding(), {
      wrapper: makeWrapper()
    });

    await expect(result.current.mutateAsync(INPUT)).rejects.toBeInstanceOf(
      StudyConflictError
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(httpPost).toHaveBeenCalledTimes(1);
    expect(httpGet).toHaveBeenCalledTimes(1);
  });
});
