import {
  getAllChiefComplaints,
  searchChiefComplaints
} from '@/utils/recommendation-interview';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InterviewAccordion } from '../interview-accordion';

const ALL_COMPLAINTS = getAllChiefComplaints();
const MOOD_COMPLAINT = searchChiefComplaints('low mood')[0];

/** Click a complaint option inside the combobox popover. */
function selectComplaintInCombobox(label: string) {
  fireEvent.click(
    screen.getByRole('button', { name: /select or search concern/i })
  );
  // Type into search input to find any complaint across all 41
  const input = screen.getByPlaceholderText(/search your concern/i);
  fireEvent.change(input, { target: { value: label } });
  const item = screen.getByText(label);
  fireEvent.click(item);
}

describe('InterviewAccordion', () => {
  describe('Step 1 — Chief Concern', () => {
    it('renders step 1 as open and step 2 as locked', () => {
      render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={vi.fn()} />
      );
      expect(screen.getByText('Chief Concern')).toBeInTheDocument();
      expect(screen.getByText('Specific Focus')).toBeInTheDocument();
      expect(screen.getByTestId('step-2-lock')).toBeInTheDocument();
    });

    it('renders the combobox inside step 1', () => {
      render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={vi.fn()} />
      );
      expect(
        screen.getByRole('button', { name: /select or search concern/i })
      ).toBeInTheDocument();
    });

    it('selecting a complaint auto-advances to step 2', () => {
      render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={vi.fn()} />
      );
      selectComplaintInCombobox(MOOD_COMPLAINT.label);
      expect(screen.getByTestId('step-1-edit')).toBeInTheDocument();
      expect(screen.getByText(/which best describes/i)).toBeInTheDocument();
    });
  });

  describe('Step 2 — Specific Focus', () => {
    it('renders complaint options when complaint is selected', () => {
      render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={vi.fn()} />
      );
      selectComplaintInCombobox(MOOD_COMPLAINT.label);
      for (const option of MOOD_COMPLAINT.options) {
        expect(screen.getByText(option.label)).toBeInTheDocument();
      }
    });

    it('calls onComplete when an option is selected', () => {
      const onComplete = vi.fn();
      render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={onComplete} />
      );
      selectComplaintInCombobox(MOOD_COMPLAINT.label);
      fireEvent.click(screen.getByText(MOOD_COMPLAINT.options[0].label));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step editing', () => {
    it('clicking edit on step 1 reopens it and resets step 2', () => {
      const onComplete = vi.fn();
      render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={onComplete} />
      );
      selectComplaintInCombobox(MOOD_COMPLAINT.label);
      // Step 2 opened
      expect(screen.getByText(/which best describes/i)).toBeInTheDocument();
      // Click edit to reopen step 1
      fireEvent.click(screen.getByTestId('step-1-edit'));
      // Combobox trigger reappears with selected complaint label
      expect(
        screen.getByRole('button', { name: MOOD_COMPLAINT.label })
      ).toBeInTheDocument();
      // Step 2 options should no longer be visible
      expect(
        screen.queryByText(/which best describes/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('No close button', () => {
    it('does not render any close (✕) button', () => {
      render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={vi.fn()} />
      );
      expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
    });
  });

  describe('Expandable layout', () => {
    it('root container has h-full class for filling parent height', () => {
      const { container } = render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={vi.fn()} />
      );
      const rootDiv = container.firstElementChild as HTMLElement;
      expect(rootDiv.className).toContain('h-full');
    });

    it('step 2 options list has flex-1 and overflow-y-auto classes when visible', () => {
      render(
        <InterviewAccordion options={ALL_COMPLAINTS} onComplete={vi.fn()} />
      );
      selectComplaintInCombobox(MOOD_COMPLAINT.label);
      const optionsList = screen.getByRole('list');
      expect(optionsList.className).toContain('flex-1');
      expect(optionsList.className).toContain('overflow-y-auto');
    });
  });
});
