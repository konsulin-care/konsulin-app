import { cn } from '@/lib/utils';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  count?: number;
};

function Skeleton({ className, count = 1, ...props }: Props) {
  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, idx) => (
          <div
            key={idx}
            className={cn('animate-pulse rounded-md bg-muted', className)}
            {...props}
          />
        ))}
    </>
  );
}

export { Skeleton };
