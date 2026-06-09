import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 *
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 *
 */
export function getFromLocalStorage(key: string): string | null {
  if (typeof window !== 'undefined') return window.localStorage.getItem(key);

  return null;
}

/**
 *
 */
export function setToLocalStorage(key: string, value: unknown): void {
  if (typeof window !== 'undefined')
    window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 *
 */
export function toQueryString(obj: Record<string, unknown>): string {
  const filteredParams = Object.entries(obj)
    .filter(([, value]) => value !== '' && value != null)
    .map(([key, value]) => {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return `${encodeURIComponent(key)}=${encodeURIComponent(str)}`;
    })
    .join('&');

  return filteredParams;
}

/**
 *
 */
export function createUniqueRandomRange(
  min: number,
  max: number
): () => number | undefined {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return function () {
    if (numbers.length === 0) return undefined;

    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers.splice(randomIndex, 1)[0];
  };
}

/**
 *
 */
export function getDaysInRange(
  startDate: string,
  endDate: string
): string[] | null {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const daysInRange: string[] = [];

  while (start <= end) {
    daysInRange.push(start.toLocaleDateString('en-US', { weekday: 'short' }));
    start.setDate(start.getDate() + 1);
  }

  return daysInRange.length === 0 ? null : daysInRange;
}

const formatter = new Intl.ListFormat('id', {
  style: 'long',
  type: 'conjunction'
});

/**
 *
 */
export function conjunction(param: string[]): string | undefined {
  if (param) return formatter.format(param);
  return undefined;
}
