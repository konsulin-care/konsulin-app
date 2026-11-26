import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ContentWrapperProps {
  className?: HTMLAnchorElement['className'];
  children: ReactNode;
}

/**
 * Renders the main page content surface that overlaps the header band.
 * The negative margin pulls the content over the band so the top hairline
 * sits on the content's top edge.
 *
 * @param props.className - Additional classes merged onto the root element.
 * @param props.children - Content rendered inside the wrapper.
 * @returns The content wrapper element.
 */
export default function ContentWraper({
  className,
  children
}: ContentWrapperProps) {
  return (
    <div
      className={cn(
        'border-border bg-background mt-[-24px] min-h-screen overflow-x-clip rounded-b-[16px] border-t pb-20 md:pb-8',
        className
      )}
    >
      {children}
    </div>
  );
}
