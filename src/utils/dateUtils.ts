import { format, isValid, parseISO } from 'date-fns';

export const formatDateRange = (start?: string, end?: string): string => {
  if (!start || !end) return '';

  const startDate = parseISO(start);
  const endDate = parseISO(end);

  if (!isValid(startDate) || !isValid(endDate)) {
    return '';
  }

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = startDate.getMonth() === endDate.getMonth();

  const dayStart = format(startDate, 'd');
  const dayEnd = format(endDate, 'd');

  const monthStart = format(startDate, 'MMM');
  const monthEnd = format(endDate, 'MMM');

  const yearStart = format(startDate, 'yyyy');
  const yearEnd = format(endDate, 'yyyy');

  if (sameYear && sameMonth) {
    return `${dayStart} – ${dayEnd} ${monthStart} ${yearStart}`;
  }

  if (sameYear && !sameMonth) {
    return `${dayStart} ${monthStart} – ${dayEnd} ${monthEnd} ${yearStart}`;
  }

  return `${dayStart} ${monthStart} ${yearStart} – ${dayEnd} ${monthEnd} ${yearEnd}`;
};
