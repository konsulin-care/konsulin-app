import { CircleX } from 'lucide-react';

interface QuestionnaireChipProps {
  /** Questionnaire title. */
  readonly name: string;
  /** Duration in minutes, or null if unknown. */
  readonly duration?: number | null;
  /** Category label, or null if unknown. */
  readonly category?: string | null;
  /** Called when the user clicks the remove button. */
  readonly onRemove: () => void;
}

/**
 * Displays a selected questionnaire as a dismissible card.
 *
 * Shows the title and an optional metadata line (duration, category).
 * Clicking the CircleX icon calls onRemove.
 */
export default function QuestionnaireChip({
  name,
  duration,
  category,
  onRemove
}: QuestionnaireChipProps) {
  const hasMetadata = duration != null || category != null;

  return (
    <div className='flex items-start justify-between rounded-lg border p-3'>
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-medium'>{name}</p>
        {hasMetadata && (
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {[duration == null ? null : `${duration} min`, category]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
      <button
        type='button'
        onClick={onRemove}
        className='text-muted-foreground hover:text-foreground ml-2 shrink-0'
        aria-label={`Remove ${name}`}
      >
        <CircleX className='h-4 w-4' />
      </button>
    </div>
  );
}
