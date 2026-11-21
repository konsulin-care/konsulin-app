import { Pencil } from 'lucide-react';

export type DetailRow = { id: string; key: string; value: string };

type Props = {
  /** Section title shown top-left. */
  title: string;
  /** Label/value rows rendered under the header. */
  rows: DetailRow[];
  /** Opens the section edit drawer; hides the pencil when omitted. */
  onEdit?: () => void;
};

/**
 * Uniform profile section card: title with a pencil on the top-right and
 * label/value rows below. Shared by every role — no role-specific styling.
 */
export default function InformationDetail({
  title,
  rows,
  onEdit
}: Readonly<Props>) {
  return (
    <div className='bg-muted w-full rounded-[16px] border-0 p-4'>
      <div className='flex w-full items-center justify-between'>
        <p className='text-foreground text-sm font-bold'>{title}</p>
        {onEdit && (
          <button
            type='button'
            onClick={onEdit}
            aria-label={`Edit ${title}`}
            data-testid='section-edit'
            className='text-turquoise-deep cursor-pointer'
          >
            <Pencil className='h-4 w-4' />
          </button>
        )}
      </div>
      <div className='border-border mt-2 flex w-full flex-col space-y-2 border-t'>
        {rows.map(row => (
          <div
            key={row.id}
            className='text-foreground mt-2 flex justify-between gap-3 text-xs'
          >
            <p className='shrink-0 text-left'>{row.key}</p>
            <p className='text-right font-bold break-words'>{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
