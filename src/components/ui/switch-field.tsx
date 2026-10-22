'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type SwitchFieldProps = {
  /** Whether the switch is ON */
  readonly checked: boolean;
  /** Change handler */
  readonly onCheckedChange: (checked: boolean) => void;
  /** Text shown when checked */
  readonly label: string;
  /** Text shown when unchecked (defaults to label) */
  readonly offLabel?: string;
  /** Additional styling */
  readonly className?: string;
};

/**
 * A compact inline toggle — [switch] label.
 *
 * Renders a Radix Switch and a label side-by-side in a single row.
 * The label changes based on the checked state.
 * Reusable across the app for any binary toggle with visible label.
 */
export function SwitchField({
  checked,
  onCheckedChange,
  label,
  offLabel,
  className
}: SwitchFieldProps) {
  const displayText = checked ? label : (offLabel ?? label);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <Label className='text-sm font-medium'>{displayText}</Label>
    </div>
  );
}
