'use client';

export interface SectionHeaderProps {
  number: number;
  label: string;
}

/**
 * Renders the numbered section divider of the participant research hub.
 *
 * @param props - Section number and the resolved section label.
 * @returns The numbered header row.
 */
export default function SectionHeader({
  number,
  label
}: Readonly<SectionHeaderProps>) {
  return (
    <div
      data-testid={`section-header-${number}`}
      className='border-border mt-6 flex items-center gap-2 border-t pt-3'
    >
      <span className='text-turquoise-deep text-xs font-bold'>
        {String(number).padStart(2, '0')}
      </span>
      <span className='text-muted-foreground text-xs font-bold tracking-wide uppercase'>
        {label}
      </span>
    </div>
  );
}
