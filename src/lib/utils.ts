import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFromLocalStorage(key: string): string | null {
  if (typeof window !== 'undefined') return window.localStorage.getItem(key)

  return null
}
