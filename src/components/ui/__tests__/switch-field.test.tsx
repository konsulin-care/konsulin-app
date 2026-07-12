import { SwitchField } from '@/components/ui/switch-field';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('SwitchField', () => {
  it('renders the switch with the label text when checked', () => {
    const onChange = vi.fn();
    render(<SwitchField checked onCheckedChange={onChange} label='Open' />);

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('renders the offLabel text when unchecked', () => {
    const onChange = vi.fn();
    render(
      <SwitchField
        checked={false}
        onCheckedChange={onChange}
        label='Open'
        offLabel='Close'
      />
    );

    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('falls back to label when offLabel is not provided', () => {
    const onChange = vi.fn();
    render(
      <SwitchField checked={false} onCheckedChange={onChange} label='Open' />
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is clicked', () => {
    const handleChange = vi.fn();
    render(
      <SwitchField
        checked={false}
        onCheckedChange={handleChange}
        label='Open'
      />
    );

    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('applies custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <SwitchField
        checked
        onCheckedChange={onChange}
        label='Open'
        className='custom-class'
      />
    );

    const row = container.firstElementChild;
    expect(row).toHaveClass('custom-class');
  });
});
