import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFromLocalStorage(key: string): string | null {
  if (typeof window !== 'undefined') return window.localStorage.getItem(key);

  return null;
}

export function setToLocalStorage(key: string, value: any): void {
  if (typeof window !== 'undefined')
    return window.localStorage.setItem(key, JSON.stringify(value));

  return null;
}

export function toQueryString(obj: Record<string, any>): string {
  const filteredParams = Object.entries(obj)
    .filter(([_, value]) => value !== '' && value != null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&');

  return filteredParams;
}

export function createUniqueRandomRange(min, max) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return function () {
    if (numbers.length === 0) return;

    const randomIndex = Math.floor(Math.random() * numbers.length);
    return numbers.splice(randomIndex, 1)[0];
  };
}

export function getDaysInRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const daysInRange = [];

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

export function conjunction(param) {
  if (param) return formatter.format(param);
}
