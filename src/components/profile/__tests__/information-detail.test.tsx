import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InformationDetail from '../information-detail';

const rows = [
  { id: 'gender', key: 'Gender', value: 'Male' },
  { id: 'birthDate', key: 'Date of Birth', value: '12 Mar 1990' }
];

describe('InformationDetail (section card)', () => {
  it('renders the section title', () => {
    render(<InformationDetail title='Personal Information' rows={rows} />);
    expect(screen.getByText('Personal Information')).toBeDefined();
  });

  it('renders label/value rows', () => {
    render(<InformationDetail title='Personal Information' rows={rows} />);
    expect(screen.getByText('Gender')).toBeDefined();
    expect(screen.getByText('Male')).toBeDefined();
    expect(screen.getByText('Date of Birth')).toBeDefined();
    expect(screen.getByText('12 Mar 1990')).toBeDefined();
  });

  it('invokes onEdit when the pencil is clicked', () => {
    const onEdit = vi.fn();
    render(
      <InformationDetail
        title='Personal Information'
        rows={rows}
        onEdit={onEdit}
      />
    );
    fireEvent.click(screen.getByTestId('section-edit'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('does not render a pencil when onEdit is omitted', () => {
    render(<InformationDetail title='Personal Information' rows={rows} />);
    expect(screen.queryByTestId('section-edit')).toBeNull();
  });
});
