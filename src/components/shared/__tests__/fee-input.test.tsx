import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import FeeInput, { computeCaretPosition } from '../fee-input';

describe('computeCaretPosition', () => {
  it('positions the caret after the same number of digits in the formatted value', () => {
    // Typed "1,0000" (caret after 4 digits), formatted to "10,000"
    expect(computeCaretPosition('1,0000', 5, '10,000')).toBe(5);
  });

  it('keeps the caret at the end when typing at the end', () => {
    // Typed "250,000" (6 digits), formatted to "2,500,000"
    expect(computeCaretPosition('250,000', 7, '2,500,000')).toBe(8);
  });

  it('keeps the caret at the start when the caret was at the start', () => {
    expect(computeCaretPosition('1,000', 0, '10,000')).toBe(0);
  });

  it('clamps to the end when the typed digits exceed the formatted length', () => {
    expect(computeCaretPosition('1,00000', 7, '1,000')).toBe(5);
  });

  it('returns 0 for an empty formatted value', () => {
    expect(computeCaretPosition('', 0, '')).toBe(0);
  });
});

/** Controlled wrapper so display reflects state after change. */
function Harness({ initial = '' }: { initial?: string }) {
  const [raw, setRaw] = useState(initial);
  return (
    <FeeInput value={raw} onChange={setRaw} aria-label='Fee' id='fee-input' />
  );
}

describe('FeeInput', () => {
  it('displays the formatted value with comma grouping', () => {
    render(<FeeInput value='250000' onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('250,000');
  });

  it('displays an empty value when value is empty', () => {
    render(<FeeInput value='' onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('passes id, placeholder, and aria-label through to the input', () => {
    render(
      <FeeInput
        value=''
        onChange={vi.fn()}
        id='assessment-fee'
        placeholder='250,000'
        aria-label='Fee'
      />
    );
    const input = screen.getByLabelText('Fee');
    expect(input).toHaveAttribute('id', 'assessment-fee');
    expect(input).toHaveAttribute('placeholder', '250,000');
  });

  it('sets inputMode to numeric', () => {
    render(<FeeInput value='' onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('inputMode', 'numeric');
  });

  it('strips non-digit characters from the change value', () => {
    const onChange = vi.fn();
    render(<FeeInput value='' onChange={onChange} aria-label='Fee' />);
    fireEvent.change(screen.getByLabelText('Fee'), {
      target: { value: 'abc250def000' }
    });
    expect(onChange).toHaveBeenCalledWith('250000');
  });

  it('re-renders with the formatted value after a change', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Fee');
    fireEvent.change(input, { target: { value: '150000' } });
    expect(input).toHaveValue('150,000');
  });
});
