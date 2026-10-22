import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface IEmptyStateProps {
  title?: string;
  subtitle?: string;
  size?: number;
  className?: string;
}

/**
 *
 */
export default function EmptyState({
  title,
  subtitle,
  size = 90,
  className
}: IEmptyStateProps) {
  const t = useTranslations('common');
  const resolvedTitle = title ?? t('no_results');
  const resolvedSubtitle = subtitle ?? t('try_different');
  return (
    <div
      className={cn(
        'flex w-full flex-grow flex-col items-center justify-center px-[auto]',
        className
      )}
    >
      <Image
        src={'/images/no-data.svg'}
        alt='no-data'
        width={size}
        height={size}
      />
      <div className='text-muted mt-4 font-bold'>{resolvedTitle}</div>
      <div className='text-muted mt-1'>{resolvedSubtitle}</div>
    </div>
  );
}
