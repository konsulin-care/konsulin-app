import { redirect } from 'next/navigation';

/** Navigate to a URL using Next.js redirect. */
export function navigate(url: string) {
  redirect(url);
}
