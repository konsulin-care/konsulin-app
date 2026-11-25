import type { ReactNode } from 'react';

/** Width variants available to {@link PageLayout}. */
export type PageLayoutVariant = 'narrow' | 'wide' | 'split';

/** Props for {@link PageLayout}. */
export interface PageLayoutProps {
  /** Layout variant; the shell's `<main>` derives the column width from it. */
  variant?: PageLayoutVariant;
  /** Complementary column rendered only by the `split` variant. */
  aside?: ReactNode;
  /** Page content. */
  children: ReactNode;
  /** Extra classes merged onto the root element. */
  className?: string;
}

const GRID_CLASSES = 'xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6';

/**
 * Page content wrapper that declares a width variant for the app shell.
 *
 * The root element carries `data-layout={variant}` so the shell's `<main>` can
 * size the column via `:has([data-layout=...])`. The `narrow` and `wide`
 * variants render children only; `split` adds a hidden-until-xl aside next to
 * the children in a two-column grid.
 *
 * @param props - Layout props, see {@link PageLayoutProps}.
 * @returns The wrapped page content.
 */
export default function PageLayout({
  variant = 'narrow',
  aside,
  children,
  className
}: PageLayoutProps) {
  const isSplit = variant === 'split';
  const classes = [isSplit ? GRID_CLASSES : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div data-layout={variant} className={classes || undefined}>
      {children}
      {isSplit && aside ? (
        <aside className='hidden xl:block'>{aside}</aside>
      ) : null}
    </div>
  );
}
