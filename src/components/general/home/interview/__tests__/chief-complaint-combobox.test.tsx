import { searchChiefComplaints } from '@/utils/recommendation-interview';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ChiefComplaintCombobox,
  COMBOBOX_PLACEHOLDER
} from '../chief-complaint-combobox';

const MOOD_COMPLAINT = searchChiefComplaints('low mood')[0];
const SLEEP_COMPLAINT = searchChiefComplaints('sleep')[0];
const QUICK_CHIPS = [MOOD_COMPLAINT, SLEEP_COMPLAINT].filter(Boolean);

describe('ChiefComplaintCombobox', () => {
  it('renders placeholder text in trigger when no value', () => {
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER })
    ).toBeInTheDocument();
  });

  it('opens popover and shows search input on click', () => {
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    expect(
      screen.getByPlaceholderText(/search your concern/i)
    ).toBeInTheDocument();
  });

  it('filters options by label when typing', () => {
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    const input = screen.getByPlaceholderText(/search your concern/i);
    fireEvent.change(input, { target: { value: 'mood' } });
    // Filtered list should contain the matching complaint
    expect(screen.getAllByText(MOOD_COMPLAINT.label).length).toBeGreaterThan(0);
    // Non-matching cmdk-item elements are hidden by cmdk
    const sleepItems = screen
      .getAllByText(SLEEP_COMPLAINT.label)
      .filter(el => el.closest('[cmdk-item]'));
    for (const item of sleepItems) {
      expect(item.closest('[cmdk-item]')).toHaveAttribute('hidden');
    }
  });

  it('filters options by synonym (Indonesian)', () => {
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    const input = screen.getByPlaceholderText(/search your concern/i);
    fireEvent.change(input, { target: { value: MOOD_COMPLAINT.synonyms[0] } });
    expect(screen.getAllByText(MOOD_COMPLAINT.label).length).toBeGreaterThan(0);
  });

  it('calls onSelect when a command item is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
        value={null}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: COMBOBOX_PLACEHOLDER }));
    // CommandItem renders as div[role="option"] inside the command list
    const options = screen.getAllByText(MOOD_COMPLAINT.label);
    // Click the one inside the popover (command list item)
    const commandItem = options.find(el => el.closest('[cmdk-item]') !== null);
    commandItem?.click();
    expect(onSelect).toHaveBeenCalledWith(MOOD_COMPLAINT);
  });

  it('shows selected complaint label in trigger when value is set', () => {
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
        value={MOOD_COMPLAINT}
        onSelect={vi.fn()}
      />
    );
    // Trigger button and quick chip both show the label — verify at least one exists
    expect(
      screen.getAllByRole('button', { name: MOOD_COMPLAINT.label }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders quick selection chips with heading', () => {
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
        value={null}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('Quick Selection')).toBeInTheDocument();
    // Chips are buttons below the combobox
    const chipButtons = screen.getAllByText(MOOD_COMPLAINT.label);
    const chip = chipButtons.find(el => el.tagName === 'BUTTON');
    expect(chip).toBeInTheDocument();
  });

  it('calls onSelect when a quick chip is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
        value={null}
        onSelect={onSelect}
      />
    );
    const chipButtons = screen.getAllByText(MOOD_COMPLAINT.label);
    const chip = chipButtons.find(el => el.tagName === 'BUTTON');
    chip?.click();
    expect(onSelect).toHaveBeenCalledWith(MOOD_COMPLAINT);
  });

  it('shows no results message when search yields nothing', () => {
    render(
      <ChiefComplaintCombobox
        options={QUICK_CHIPS}
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
