import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFromLocalStorage(key: string): string | null {
  if (typeof window !== 'undefined') return window.localStorage.getItem(key)

  return null
}

export function toQueryString(obj: Record<string, any>): string {
  const filteredParams = Object.entries(obj)
    .filter(([_, value]) => value !== '' && value != null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&')

  return filteredParams
}

export function createUniqueRandomRange(min, max) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min)

  return function () {
    if (numbers.length === 0) return

    const randomIndex = Math.floor(Math.random() * numbers.length)
    return numbers.splice(randomIndex, 1)[0]
  }
}
