'use client';

import { getNow } from '@/constants/date';
import { IUseClinicParams } from '@/services/clinic';
import { parseTime } from '@/utils/helper';
import {
  endOfDay,
  format,
  isAfter,
  isBefore,
  parse,
  parseISO,
  setHours,
  setMinutes,
  startOfDay
} from 'date-fns';
import { useMemo } from 'react';

/**
 *
 */
export function useScheduleFilter<T extends { slotStart?: string | null }>({
  data,
  sessionsFilter,
  keyword,
  keywordMatcher
}: {
  data: T[] | null;
  sessionsFilter: IUseClinicParams;
  keyword: string;
  keywordMatcher: (item: T, query: string) => boolean;
}) {
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const { start_date, end_date, start_time, end_time } = sessionsFilter;

    const hasDateFilter = Boolean(start_date) && Boolean(end_date);
    const hasTimeFilter = Boolean(start_time) || Boolean(end_time);

    const filterStartDate = start_date;
    const filterEndDate = end_date;

    const filterStartTime = start_time
      ? parseTime(start_time, 'HH:mm')
      : setHours(setMinutes(new Date(), 0), 0);

    const filterEndTime = end_time
      ? parseTime(end_time, 'HH:mm')
      : setHours(setMinutes(new Date(), 59), 23);

    return data.filter(session => {
      if (!session.slotStart) return false;

      const sessionDate = parseISO(session.slotStart);

      if (
        hasDateFilter &&
        (isBefore(sessionDate, startOfDay(filterStartDate!)) ||
          isAfter(sessionDate, endOfDay(filterEndDate!)))
      ) {
        return false;
      }

      if (hasTimeFilter) {
        const sessionTimeOnly = parse(
          format(sessionDate, 'HH:mm'),
          'HH:mm',
          new Date()
        );

        if (
          isBefore(sessionTimeOnly, filterStartTime) ||
          isAfter(sessionTimeOnly, filterEndTime)
        ) {
          return false;
        }
      }

      if (keyword && !keywordMatcher(session, keyword)) {
        return false;
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sessionsFilter, keyword]);

  const upcoming = useMemo(() => {
    if (!filteredData) return [];
    return filteredData
      .filter(s => s.slotStart && new Date(s.slotStart) >= getNow())
      .sort(
        (a, b) =>
          new Date(a.slotStart!).getTime() - new Date(b.slotStart!).getTime()
      );
  }, [filteredData]);

  const past = useMemo(() => {
    if (!filteredData) return [];
    return filteredData
      .filter(s => s.slotStart && new Date(s.slotStart) < getNow())
      .sort(
        (a, b) =>
          new Date(b.slotStart!).getTime() - new Date(a.slotStart!).getTime()
      );
  }, [filteredData]);

  return { filteredData, upcoming, past };
}
