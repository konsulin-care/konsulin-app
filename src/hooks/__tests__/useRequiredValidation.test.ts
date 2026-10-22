import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockInvalidItems } = vi.hoisted(() => ({
  mockInvalidItems: vi.fn()
}));

vi.mock('@aehrc/smart-forms-renderer', () => ({
  useQuestionnaireResponseStore: Object.assign(vi.fn(), {
    use: { invalidItems: mockInvalidItems }
  })
}));

import { useRequiredValidation } from '../useRequiredValidation';

describe('useRequiredValidation', () => {
  it('returns requiredItemEmpty=0 when invalidItems is empty', () => {
    mockInvalidItems.mockReturnValue({});
    const { result } = renderHook(() => useRequiredValidation());
    expect(result.current.requiredItemEmpty).toBe(0);
  });

  it('sets requiredItemEmpty to count of required issues when invalidItems has items', () => {
    mockInvalidItems.mockReturnValue({
      q1: {
        issue: [
          {
            code: 'required',
            expression: ['item[0]'],
            details: { text: 'Required' }
          }
        ]
      }
    });
    const { result } = renderHook(() => useRequiredValidation());
    expect(result.current.requiredItemEmpty).toBe(1);
  });

  it('resets requiredItemEmpty to 0 when invalidItems becomes empty', () => {
    mockInvalidItems.mockReturnValue({
      q1: {
        issue: [
          {
            code: 'required',
            expression: ['item[0]'],
            details: { text: 'Required' }
          }
        ]
      }
    });
    const { result, rerender } = renderHook(() => useRequiredValidation());
    expect(result.current.requiredItemEmpty).toBe(1);
    mockInvalidItems.mockReturnValue({});
    rerender();
    expect(result.current.requiredItemEmpty).toBe(0);
  });

  it('updates requiredItemEmpty when invalidItems changes from empty to non-empty', () => {
    // Simulate: user has not answered any questions → invalidItems is empty
    mockInvalidItems.mockReturnValue({});
    const { result, rerender } = renderHook(() => useRequiredValidation());
    expect(result.current.requiredItemEmpty).toBe(0);

    // Simulate: user answers q1, q2 is now revealed as required and empty
    mockInvalidItems.mockReturnValue({
      q2: {
        issue: [
          {
            code: 'required',
            expression: ['item[1]'],
            details: { text: 'Required' }
          }
        ]
      }
    });
    rerender();
    expect(result.current.requiredItemEmpty).toBe(1);
  });

  it('filters out non-required issues', () => {
    mockInvalidItems.mockReturnValue({
      q1: {
        issue: [
          {
            code: 'required',
            expression: ['item[0]'],
            details: { text: 'Required' }
          },
          {
            code: 'value',
            expression: ['item[0]'],
            details: { text: 'Invalid value' }
          }
        ]
      },
      q2: {
        issue: [
          {
            code: 'required',
            expression: ['item[1]'],
            details: { text: 'Required' }
          }
        ]
      }
    });
    const { result } = renderHook(() => useRequiredValidation());
    // Only 'required' issues count, not 'value' issues
    expect(result.current.requiredItemEmpty).toBe(2);
  });

  it('checkRequiredIsEmpty computes count from current invalidItems', () => {
    mockInvalidItems.mockReturnValue({
      q1: {
        issue: [
          {
            code: 'required',
            expression: ['item[0]'],
            details: { text: 'Required' }
          }
        ]
      }
    });
    const { result, rerender } = renderHook(() => useRequiredValidation());
    expect(result.current.requiredItemEmpty).toBe(1);
    // Adding a second required issue then re-render to update invalidItems snapshot
    mockInvalidItems.mockReturnValue({
      q1: {
        issue: [
          {
            code: 'required',
            expression: ['item[0]'],
            details: { text: 'Required' }
          }
        ]
      },
      q2: {
        issue: [
          {
            code: 'required',
            expression: ['item[1]'],
            details: { text: 'Required' }
          }
        ]
      }
    });
    rerender();
    // After re-render, the effect auto-computes the new count
    expect(result.current.requiredItemEmpty).toBe(2);
    // checkRequiredIsEmpty can also be called on demand
    act(() => {
      result.current.checkRequiredIsEmpty();
    });
    expect(result.current.requiredItemEmpty).toBe(2);
  });
});
