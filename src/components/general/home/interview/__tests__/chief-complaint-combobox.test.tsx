import {
  getAllChiefComplaints,
  searchChiefComplaints
} from '@/utils/recommendation-interview';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ChiefComplaintCombobox,
  COMBOBOX_PLACEHOLDER
} from '../chief-complaint-combobox';

const ALL_OPTIONS = getAllChiefComplaints();
const MOOD_COMPLAINT = searchChiefComplaints('low mood')[0];

describe('ChiefComplaintCombobox', () => {
  it('renders placeholder text in trigger when no value', () => {
    render(
      <ChiefComplaintCombobox
        options={ALL_OPTIONS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER })
    ).toBeInTheDocument();
  });

  it('opens popover and shows top 5 quick choices when search input is empty', () => {
    render(
      <ChiefComplaintCombobox
        options={ALL_OPTIONS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    expect(
      screen.getByPlaceholderText(/search your concern/i)
    ).toBeInTheDocument();

    // Verify top 5 quick selection items are shown in popover
    expect(
      screen.getByText('Emotional Exhaustion & Burnout')
    ).toBeInTheDocument();
    expect(screen.getByText('Anxiety, Stress & Panic')).toBeInTheDocument();
    expect(screen.getByText('Stomach & Digestion Issues')).toBeInTheDocument();
    expect(
      screen.getByText('Musculoskeletal & Joint Pain')
    ).toBeInTheDocument();
    expect(screen.getByText('Fever & General Malaise')).toBeInTheDocument();
  });

  it('does not render separate quick selection chips below combobox', () => {
    render(
      <ChiefComplaintCombobox
        options={ALL_OPTIONS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    expect(screen.queryByText('Quick Selection')).not.toBeInTheDocument();
  });

  it('filters all options when user types search query', () => {
    render(
      <ChiefComplaintCombobox
        options={ALL_OPTIONS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    const input = screen.getByPlaceholderText(/search your concern/i);

    // Type a query that is not in the top 5 (e.g. 'mood')
    fireEvent.change(input, { target: { value: 'mood' } });
    expect(screen.getByText(MOOD_COMPLAINT.label)).toBeInTheDocument();
  });

  it('filters options by synonym (Indonesian)', () => {
    render(
      <ChiefComplaintCombobox
        options={ALL_OPTIONS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    const input = screen.getByPlaceholderText(/search your concern/i);
    fireEvent.change(input, { target: { value: MOOD_COMPLAINT.synonyms[0] } });
    expect(screen.getByText(MOOD_COMPLAINT.label)).toBeInTheDocument();
  });

  it('calls onSelect when a command item is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ChiefComplaintCombobox
        options={ALL_OPTIONS}
        value={null}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    const item = screen.getByText('Emotional Exhaustion & Burnout');
    item.click();
    expect(onSelect).toHaveBeenCalled();
  });

  it('shows selected complaint label in trigger when value is set', () => {
    render(
      <ChiefComplaintCombobox
        options={ALL_OPTIONS}
        value={MOOD_COMPLAINT}
        onSelect={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: MOOD_COMPLAINT.label })
    ).toBeInTheDocument();
  });

  it('shows no results message when search yields nothing', () => {
    render(
      <ChiefComplaintCombobox
        options={ALL_OPTIONS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    const input = screen.getByPlaceholderText(/search your concern/i);
    fireEvent.change(input, { target: { value: 'xyznonexistent' } });
    expect(screen.getByText(/no matching concern/i)).toBeInTheDocument();
  });
});
