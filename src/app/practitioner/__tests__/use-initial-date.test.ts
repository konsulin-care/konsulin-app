import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInitialDate } from '../hooks/use-initial-date';

const defaultProps = {
  isPageMode: true,
  today: new Date('2026-07-15'),
  listAvailableDate: [] as Date[],
  isOpenParam: null as string | null,
  bookingDate: new Date('2026-07-15'),
  hasUserChosenDate: false,
  handleFilterChange: vi.fn(),
  pageDate: new Date('2026-07-15'),
  setPageDate: vi.fn()
};

describe('useInitialDate', () => {
  describe('page mode', () => {
    it('does not set pageDate when listAvailableDate is empty', () => {
      const setPageDate = vi.fn();
      renderHook(() =>
        useInitialDate({
          ...defaultProps,
          listAvailableDate: [],
          setPageDate
        })
      );
      expect(setPageDate).not.toHaveBeenCalled();
    });

    it('sets pageDate when listAvailableDate has entries', () => {
      const setPageDate = vi.fn();
      const availableDate = new Date('2026-07-16');
      renderHook(() =>
        useInitialDate({
          ...defaultProps,
          listAvailableDate: [availableDate],
          pageDate: new Date('2026-07-15'),
          setPageDate
        })
      );
      expect(setPageDate).toHaveBeenCalledWith(availableDate);
    });

    it('does not overwrite pageDate when hasUserChosenDate is true', () => {
      const setPageDate = vi.fn();
      const userChosenDate = new Date('2026-07-20');
      renderHook(() =>
        useInitialDate({
          ...defaultProps,
          listAvailableDate: [new Date('2026-07-16')],
          hasUserChosenDate: true,
          pageDate: userChosenDate,
          setPageDate
        })
      );
      expect(setPageDate).not.toHaveBeenCalled();
    });

    it('does not set pageDate when listAvailableDate becomes empty later', () => {
      const setPageDate = vi.fn();
      const { rerender } = renderHook(props => useInitialDate(props), {
        initialProps: {
          ...defaultProps,
          listAvailableDate: [new Date('2026-07-16')],
          setPageDate
        }
      });

      // First render sets pageDate
      expect(setPageDate).toHaveBeenCalledTimes(1);

      // Rerender with empty list — should not call setPageDate again
      rerender({
        ...defaultProps,
        listAvailableDate: [],
        setPageDate
      });

      expect(setPageDate).toHaveBeenCalledTimes(1);
    });
  });

  describe('drawer mode', () => {
    it('does not call setPageDate in drawer mode', () => {
      const setPageDate = vi.fn();
      renderHook(() =>
        useInitialDate({
          ...defaultProps,
          isPageMode: false,
          listAvailableDate: [new Date('2026-07-16')],
          setPageDate
        })
      );
      expect(setPageDate).not.toHaveBeenCalled();
    });
  });
});
