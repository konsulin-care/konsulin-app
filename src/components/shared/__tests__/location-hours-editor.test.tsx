import { DayOfWeek, TimeRange } from '@/types/availability';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LocationHoursEditor from '../location-hours-editor';

const emptyHours: Record<DayOfWeek, TimeRange[]> = {
  0: [],
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: []
};

const filledHours: Record<DayOfWeek, TimeRange[]> = {
  0: [{ id: 'tr-1', from: '08:00', to: '17:00' }],
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: []
};

describe('LocationHoursEditor', () => {
  it('renders 7 day selector buttons', () => {
    render(
      <LocationHoursEditor
        hours={emptyHours}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
      />
    );

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('defaults to Monday selected', () => {
    render(
      <LocationHoursEditor
        hours={emptyHours}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
      />
    );

    // Monday should show the day header
    expect(screen.getByText('Monday Hours')).toBeInTheDocument();
  });

  it('shows no hours message for empty day', () => {
    render(
      <LocationHoursEditor
        hours={emptyHours}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
      />
    );

    expect(screen.getByText('No hours set for this day')).toBeInTheDocument();
  });

  it('shows time ranges for selected day', () => {
    render(
      <LocationHoursEditor
        hours={filledHours}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
  });

  it('switches day view when clicking another day', () => {
    render(
      <LocationHoursEditor
        hours={{
          ...emptyHours,
          1: [{ id: 'tr-2', from: '09:00', to: '18:00' }]
        }}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
      />
    );

    // Monday selected by default — no hours
    expect(screen.getByText('No hours set for this day')).toBeInTheDocument();

    // Click Tuesday
    fireEvent.click(screen.getByText('Tue'));
    expect(screen.getByText('Tuesday Hours')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
  });

  it('calls onAddTimeRange with selected day when Add Time clicked', () => {
    const onAdd = vi.fn();
    render(
      <LocationHoursEditor
        hours={emptyHours}
        onAddTimeRange={onAdd}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Add Time'));
    expect(onAdd).toHaveBeenCalledWith(0); // Monday
  });

  it('calls onAddTimeRange for correct day after switching', () => {
    const onAdd = vi.fn();
    render(
      <LocationHoursEditor
        hours={emptyHours}
        onAddTimeRange={onAdd}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Wed'));
    fireEvent.click(screen.getByText('Add Time'));
    expect(onAdd).toHaveBeenCalledWith(2); // Wednesday
  });

  it('calls onDeleteTimeRange when remove button clicked', () => {
    const onDelete = vi.fn();
    render(
      <LocationHoursEditor
        hours={filledHours}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={vi.fn()}
        onDeleteTimeRange={onDelete}
      />
    );

    const removeBtn = screen.getByLabelText('Remove time range');
    fireEvent.click(removeBtn);
    expect(onDelete).toHaveBeenCalledWith(0, 'tr-1');
  });

  it('calls onUpdateTimeRange when time input changes', () => {
    const onUpdate = vi.fn();
    render(
      <LocationHoursEditor
        hours={filledHours}
        onAddTimeRange={vi.fn()}
        onUpdateTimeRange={onUpdate}
        onDeleteTimeRange={vi.fn()}
      />
    );

    const fromInput = screen.getByDisplayValue('08:00');
    fireEvent.change(fromInput, { target: { value: '09:00' } });
    expect(onUpdate).toHaveBeenCalledWith(0, 'tr-1', 'from', '09:00');
  });
});
