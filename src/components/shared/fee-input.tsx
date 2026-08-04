'use client';

import { Input } from '@/components/ui/input';
import { formatFeeValue } from '@/utils/fhir/fee';
import { useCallback, useRef } from 'react';

type FeeInputProps = {
  /** Raw digit string, e.g. "250000". Empty string renders an empty input. */
  readonly value: string;
  /** Called with the raw digits only, without separators. */
  readonly onChange: (raw: string) => void;
  readonly id?: string;
  readonly placeholder?: string;
  readonly className?: string;
  readonly 'aria-label'?: string;
};

/**
 * Compute the caret position in a formatted value after a change.
 *
 * The user edits the formatted string; the caret must land after the same
 * number of digits in the reformatted output so mid-number edits do not
 * jump to the end.
 *
 * @param typedValue - The value the user produced in the input, separators included
 * @param caretInTyped - Caret offset within `typedValue` before reformatting
 * @param formattedValue - The reformatted value that will be displayed
 * @returns The caret offset to apply to `formattedValue`
 */
export function computeCaretPosition(
  typedValue: string,
  caretInTyped: number,
  formattedValue: string
): number {
  const digitsBeforeCaret = typedValue
    .slice(0, caretInTyped)
    .replace(/\D/g, '').length;
  let position = 0;
  let digitsSeen = 0;
  while (position < formattedValue.length && digitsSeen < digitsBeforeCaret) {
    if (/\d/.test(formattedValue[position])) {
      digitsSeen++;
    }
    position++;
  }
  return position;
}

/**
 * Numeric fee input that displays locale-grouped digits (e.g. "250,000")
 * while keeping the parent's state as raw digits.
 *
 * Strips non-digit characters on change and restores the caret position
 * after reformatting so editing mid-number keeps its place.
 *
 * @param props - See FeeInputProps
 * @returns The fee input element
 */
export default function FeeInput({
  value,
  onChange,
  id,
  placeholder,
  className,
  'aria-label': ariaLabel
}: FeeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const typedValue = e.target.value;
      const caretInTyped = e.target.selectionStart ?? typedValue.length;
      const raw = typedValue.replace(/\D/g, '');
      onChange(raw);
      const formatted = raw ? formatFeeValue(Number(raw)) : '';
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          const position = computeCaretPosition(
            typedValue,
            caretInTyped,
            formatted
          );
          el.setSelectionRange(position, position);
        }
      });
    },
    [onChange]
  );

  const displayValue = value ? formatFeeValue(Number(value)) : '';

  return (
    <Input
      ref={inputRef}
      id={id}
      value={displayValue}
      onChange={handleChange}
      inputMode='numeric'
      placeholder={placeholder}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
