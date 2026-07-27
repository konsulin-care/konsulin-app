import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Questionnaire, QuestionnaireResponseItem } from 'fhir/r4';

const {
  mockSourceQuestionnaire,
  mockCurrentPageIndex,
  mockUpdatableResponseItems
} = vi.hoisted(() => ({
  mockSourceQuestionnaire: vi.fn<() => Questionnaire>(),
  mockCurrentPageIndex: vi.fn<() => number>().mockReturnValue(0),
  mockUpdatableResponseItems:
    vi.fn<() => Record<string, QuestionnaireResponseItem[]>>()
}));

vi.mock('@aehrc/smart-forms-renderer', () => ({
  useQuestionnaireStore: Object.assign(vi.fn(), {
    use: {
      sourceQuestionnaire: mockSourceQuestionnaire,
      currentPageIndex: mockCurrentPageIndex
    }
  }),
  useQuestionnaireResponseStore: Object.assign(vi.fn(), {
    use: {
      updatableResponseItems: mockUpdatableResponseItems
    }
  })
}));

import { useQuestionFocus } from '../useQuestionFocus';

function answered(linkId: string): QuestionnaireResponseItem {
  return { linkId, text: linkId, answer: [{ valueString: 'yes' }] };
}

function unanswered(linkId: string): QuestionnaireResponseItem {
  return { linkId, text: linkId };
}

describe('useQuestionFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentPageIndex.mockReturnValue(0);
  });

  it('returns first question as active when no answers exist', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        { linkId: 'q1', text: 'Q1', type: 'string' },
        { linkId: 'q2', text: 'Q2', type: 'string' }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      q2: [unanswered('q2')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.activeLinkId).toBe('q1');
    expect(result.current.answeredCount).toBe(0);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.linkIds).toEqual(['q1', 'q2']);
  });

  it('returns second question as active when first is answered', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        { linkId: 'q1', text: 'Q1', type: 'choice' },
        { linkId: 'q2', text: 'Q2', type: 'choice' }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [unanswered('q2')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.activeLinkId).toBe('q2');
    expect(result.current.answeredCount).toBe(1);
  });

  it('returns null when all questions are answered', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        { linkId: 'q1', text: 'Q1', type: 'string' },
        { linkId: 'q2', text: 'Q2', type: 'string' }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [answered('q2')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.activeLinkId).toBeNull();
    expect(result.current.answeredCount).toBe(2);
  });

  it('skips display items', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        { linkId: 'inst', text: 'Instruction', type: 'display' },
        { linkId: 'q1', text: 'Q1', type: 'string' }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      inst: [unanswered('inst')],
      q1: [unanswered('q1')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.activeLinkId).toBe('q1');
    expect(result.current.totalCount).toBe(1);
  });

  it('skips group items (groups are containers, not answerable)', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        { linkId: 'g1', text: 'Group', type: 'group' },
        { linkId: 'q1', text: 'Q1', type: 'string' }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.activeLinkId).toBe('q1');
    expect(result.current.totalCount).toBe(1);
  });

  it('skips readOnly items', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        { linkId: 'q1', text: 'Q1', type: 'string' },
        { linkId: 'score', text: 'Score', type: 'integer', readOnly: true }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      score: [unanswered('score')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.activeLinkId).toBe('q1');
    expect(result.current.totalCount).toBe(1);
  });

  it('recursively walks nested groups', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        {
          linkId: 'g1',
          text: 'Group 1',
          type: 'group',
          item: [
            { linkId: 'q1', text: 'Q1', type: 'string' },
            { linkId: 'q2', text: 'Q2', type: 'string' }
          ]
        },
        {
          linkId: 'g2',
          text: 'Group 2',
          type: 'group',
          item: [
            {
              linkId: 'sg',
              text: 'Sub',
              type: 'group',
              item: [{ linkId: 'q3', text: 'Q3', type: 'string' }]
            }
          ]
        }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      q2: [unanswered('q2')],
      q3: [unanswered('q3')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.activeLinkId).toBe('q1');
    expect(result.current.totalCount).toBe(3);
    expect(result.current.linkIds).toEqual(['q1', 'q2', 'q3']);
  });

  it('counts answered items correctly with mixed answers', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        { linkId: 'q1', text: 'Q1', type: 'choice' },
        { linkId: 'q2', text: 'Q2', type: 'choice' },
        { linkId: 'q3', text: 'Q3', type: 'choice' }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [unanswered('q2')],
      q3: [answered('q3')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.answeredCount).toBe(2);
    expect(result.current.activeLinkId).toBe('q2');
  });

  it('handles items with nested content in groups', () => {
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: [
        { linkId: 'q1', text: 'Q1', type: 'string' },
        {
          linkId: 'g1',
          text: 'Group',
          type: 'group',
          item: [
            { linkId: 'q2', text: 'Q2', type: 'choice' },
            { linkId: 'q3', text: 'Q3', type: 'choice' }
          ]
        }
      ]
    });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      q2: [unanswered('q2')],
      q3: [unanswered('q3')]
    });

    const { result } = renderHook(() => useQuestionFocus());

    expect(result.current.linkIds).toEqual(['q1', 'q2', 'q3']);
  });
});
