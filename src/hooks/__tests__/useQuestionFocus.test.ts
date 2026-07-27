import { act, renderHook } from '@testing-library/react';
import type { Questionnaire, QuestionnaireItem } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSourceQuestionnaire, mockItemMap, mockUpdatableResponseItems } =
  vi.hoisted(() => ({
    mockSourceQuestionnaire: vi.fn<() => Questionnaire>(),
    mockItemMap: vi.fn<() => Record<string, QuestionnaireItem>>(),
    mockUpdatableResponseItems: vi.fn<() => Record<string, any[]>>()
  }));

vi.mock('@aehrc/smart-forms-renderer', () => ({
  useQuestionnaireStore: Object.assign(vi.fn(), {
    use: { sourceQuestionnaire: mockSourceQuestionnaire, itemMap: mockItemMap }
  }),
  useQuestionnaireResponseStore: Object.assign(vi.fn(), {
    use: { updatableResponseItems: mockUpdatableResponseItems }
  })
}));

import { useQuestionFocus } from '../useQuestionFocus';

const focusable = (
  linkId: string,
  o?: Partial<QuestionnaireItem>
): QuestionnaireItem => ({
  linkId,
  text: linkId,
  type: 'choice',
  required: true,
  ...o
});
const nonRequired = (
  linkId: string,
  o?: Partial<QuestionnaireItem>
): QuestionnaireItem => ({
  linkId,
  text: linkId,
  type: 'choice',
  required: false,
  ...o
});
const display = (
  linkId: string,
  o?: Partial<QuestionnaireItem>
): QuestionnaireItem => ({ linkId, text: linkId, type: 'display', ...o });
const readOnly = (
  linkId: string,
  o?: Partial<QuestionnaireItem>
): QuestionnaireItem => ({
  linkId,
  text: linkId,
  type: 'choice',
  required: true,
  readOnly: true,
  ...o
});
const answered = (linkId: string): any => ({
  linkId,
  text: linkId,
  answer: [{ valueString: 'yes' }]
});
const unanswered = (linkId: string): any => ({ linkId, text: linkId });

const toItemMap = (
  items: QuestionnaireItem[]
): Record<string, QuestionnaireItem> => {
  const map: Record<string, QuestionnaireItem> = {};
  for (const item of items) {
    map[item.linkId] = item;
    if (item.item) Object.assign(map, toItemMap(item.item));
  }
  return map;
};

describe('useQuestionFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockItemMap.mockReturnValue({});
  });

  it('sets activeCardIndex to 0 when no answers exist', () => {
    const items = [focusable('q1'), focusable('q2')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      q2: [unanswered('q2')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.activeCardIndex).toBe(0);
    expect(result.current.totalFocusable).toBe(2);
    expect(result.current.totalAnswerable).toBe(2);
  });

  it('sets activeCardIndex to first unanswered focusable index', () => {
    const items = [focusable('q1'), focusable('q2'), focusable('q3')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [unanswered('q2')],
      q3: [unanswered('q3')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.activeCardIndex).toBe(1);
    expect(result.current.totalFocusable).toBe(3);
  });

  it('sets activeCardIndex to -1 when all focusable items answered', () => {
    const items = [focusable('q1'), focusable('q2')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [answered('q2')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.activeCardIndex).toBe(-1);
    expect(result.current.totalFocusable).toBe(2);
  });

  it('excludes display items from focus count', () => {
    const items = [display('inst'), focusable('q1'), focusable('q2')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      inst: [unanswered('inst')],
      q1: [unanswered('q1')],
      q2: [unanswered('q2')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.totalFocusable).toBe(2);
    expect(result.current.totalAnswerable).toBe(2);
    expect(result.current.displayItemLinkIds).toEqual(['inst']);
  });

  it('excludes readOnly items from focus count', () => {
    const items = [focusable('q1'), readOnly('score'), focusable('q2')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      score: [unanswered('score')],
      q2: [unanswered('q2')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.totalFocusable).toBe(2);
    expect(result.current.totalAnswerable).toBe(3);
  });

  it('excludes non-required items from focus count', () => {
    const items = [focusable('q1'), nonRequired('q2'), focusable('q3')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      q2: [unanswered('q2')],
      q3: [unanswered('q3')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.totalFocusable).toBe(2);
    expect(result.current.totalAnswerable).toBe(3);
  });

  it('computes correct cardStates for answered/active/future', () => {
    const items = [focusable('q1'), focusable('q2'), focusable('q3')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [unanswered('q2')],
      q3: [unanswered('q3')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.cardStates).toEqual({
      q1: 'answered',
      q2: 'active',
      q3: 'future'
    });
  });

  it('computes cardStates with all answered', () => {
    const items = [focusable('q1'), focusable('q2')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [answered('q2')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.cardStates).toEqual({
      q1: 'answered',
      q2: 'answered'
    });
    expect(result.current.activeCardIndex).toBe(-1);
  });

  it('setActiveCardIndex advances and retreats correctly', () => {
    const items = [focusable('q1'), focusable('q2'), focusable('q3')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      q2: [unanswered('q2')],
      q3: [unanswered('q3')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.activeCardIndex).toBe(0);
    act(() => {
      result.current.setActiveCardIndex(1);
    });
    expect(result.current.activeCardIndex).toBe(1);
    act(() => {
      result.current.setActiveCardIndex(2);
    });
    expect(result.current.activeCardIndex).toBe(2);
  });

  it('setActiveCardIndex retreats backward correctly', () => {
    const items = [focusable('q1'), focusable('q2'), focusable('q3')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [unanswered('q2')],
      q3: [unanswered('q3')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.activeCardIndex).toBe(1);
    act(() => {
      result.current.setActiveCardIndex(0);
    });
    expect(result.current.activeCardIndex).toBe(0);
  });

  it('cardStates updates after answering a question', () => {
    const items = [focusable('q1'), focusable('q2')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      q2: [unanswered('q2')]
    });
    const { result, rerender } = renderHook(() => useQuestionFocus());
    expect(result.current.cardStates).toEqual({ q1: 'active', q2: 'future' });
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [unanswered('q2')]
    });
    rerender();
    expect(result.current.cardStates).toEqual({ q1: 'answered', q2: 'active' });
    expect(result.current.activeCardIndex).toBe(1);
  });

  it('isRequired and isAnswered return correct values', () => {
    const items = [focusable('q1'), nonRequired('q2')];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [answered('q1')],
      q2: [unanswered('q2')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.isRequired('q1')).toBe(true);
    expect(result.current.isRequired('q2')).toBe(false);
    expect(result.current.isAnswered('q1')).toBe(true);
    expect(result.current.isAnswered('q2')).toBe(false);
  });

  it('focusableLinkIds includes only required non-readOnly items', () => {
    const items = [
      focusable('q1'),
      nonRequired('q2'),
      readOnly('q3'),
      focusable('q4')
    ];
    mockSourceQuestionnaire.mockReturnValue({
      resourceType: 'Questionnaire',
      id: 'test',
      status: 'active',
      item: items
    });
    mockItemMap.mockReturnValue(toItemMap(items));
    mockUpdatableResponseItems.mockReturnValue({
      q1: [unanswered('q1')],
      q2: [unanswered('q2')],
      q3: [unanswered('q3')],
      q4: [unanswered('q4')]
    });
    const { result } = renderHook(() => useQuestionFocus());
    expect(result.current.focusableLinkIds).toEqual(['q1', 'q4']);
  });
});
