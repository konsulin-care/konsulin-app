'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import type { ComponentProps } from 'react';
import { forwardRef } from 'react';

import { ButtonProps, buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

const Pagination = ({ className, ...props }: ComponentProps<'nav'>) => (
  <nav
    role='navigation'
    aria-label='pagination'
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);
Pagination.displayName = 'Pagination';

const PaginationContent = forwardRef<HTMLUListElement, ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
);
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = forwardRef<HTMLLIElement, ComponentProps<'li'>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn('', className)} {...props} />
  )
);
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  ComponentProps<'a'>;

const PaginationLink = ({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? 'outline' : 'ghost',
        size
      }),
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({
  className,
  ...props
}: ComponentProps<typeof PaginationLink>) => {
  const t = useTranslations('common');
  return (
    <PaginationLink
      aria-label={t('pagination.previous_page')}
      size='default'
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeft className='h-4 w-4' />
      <span>{t('pagination.previous')}</span>
    </PaginationLink>
  );
};
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({
  className,
  ...props
}: ComponentProps<typeof PaginationLink>) => {
  const t = useTranslations('common');
  return (
    <PaginationLink
      aria-label={t('pagination.next_page')}
      size='default'
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span>{t('pagination.next')}</span>
      <ChevronRight className='h-4 w-4' />
    </PaginationLink>
  );
};
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({
  className,
  ...props
}: ComponentProps<'span'>) => {
  const t = useTranslations('common');
  return (
    <span
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className='h-4 w-4' />
      <span className='sr-only'>{t('pagination.more_pages')}</span>
    </span>
  );
};
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
};
