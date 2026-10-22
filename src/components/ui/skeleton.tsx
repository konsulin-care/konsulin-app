import { cn } from '@/lib/utils';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  count?: number;
};

/**
 *
 */
function Skeleton({ className, count = 1, ...props }: Props) {
  return (
    <>
      {Array.from({ length: count }, (_, idx) => (
        <div
          key={idx}
          className={cn('bg-muted animate-pulse rounded-md', className)}
          {...props}
        />
      ))}
    </>
  );
}

export { Skeleton };
