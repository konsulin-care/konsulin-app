import { cn } from '@/lib/utils';

interface LoadingSectionProps {
  className?: string;
}

/** Pure CSS skeleton with pulse animation. No icon or component imports — ~0.5KB. */
export default function LoadingSection({
  className
}: Readonly<LoadingSectionProps>) {
  return (
    <div
      data-testid='loading-section'
      className={cn(
        'h-24 w-full animate-pulse rounded-lg bg-gray-100',
        className
      )}
    />
  );
}
