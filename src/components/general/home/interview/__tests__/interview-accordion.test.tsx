import { searchChiefComplaints } from '@/utils/recommendation-interview';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InterviewAccordion } from '../interview-accordion';

const MOOD_COMPLAINT = searchChiefComplaints('low mood')[0];
const SLEEP_COMPLAINT = searchChiefComplaints('sleep')[0];
const QUICK_CHIPS = [MOOD_COMPLAINT, SLEEP_COMPLAINT].filter(Boolean);

/** Click a quick-selection chip (button with rounded-full outside the popover). */
function clickQuickChip(label: string) {
  // Quick chips: button with rounded-full class, inside the quick selection div
  const buttons = screen.getAllByText(label);
  const chip = buttons.find(
    el => el.tagName === 'BUTTON' && el.className.includes('rounded-full')
  );
  expect(chip).toBeTruthy();
  fireEvent.click(chip);
}

describe('InterviewAccordion', () => {
  describe('Step 1 — Chief Concern', () => {
    it('renders step 1 as open and step 2 as locked', () => {
      render(<InterviewAccordion options={QUICK_CHIPS} onComplete={vi.fn()} />);
      expect(screen.getByText('Chief Concern')).toBeInTheDocument();
      expect(screen.getByText('Specific Focus')).toBeInTheDocument();
      expect(screen.getByTestId('step-2-lock')).toBeInTheDocument();
    });

    it('renders the combobox inside step 1', () => {
      render(<InterviewAccordion options={QUICK_CHIPS} onComplete={vi.fn()} />);
      expect(
        screen.getByRole('button', { name: /select or search concern/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Quick Selection')).toBeInTheDocument();
    });

    it('selecting a complaint auto-advances to step 2', () => {
      render(<InterviewAccordion options={QUICK_CHIPS} onComplete={vi.fn()} />);
      clickQuickChip(MOOD_COMPLAINT.label);
      expect(screen.getByTestId('step-1-edit')).toBeInTheDocument();
      expect(screen.getByText(/which best describes/i)).toBeInTheDocument();
    });
  });

  describe('Step 2 — Specific Focus', () => {
    it('renders complaint options when complaint is selected', () => {
      render(<InterviewAccordion options={QUICK_CHIPS} onComplete={vi.fn()} />);
      clickQuickChip(MOOD_COMPLAINT.label);
      for (const option of MOOD_COMPLAINT.options) {
        expect(screen.getByText(option.label)).toBeInTheDocument();
      }
    });

    it('calls onComplete when an option is selected', () => {
      const onComplete = vi.fn();
      render(
        <InterviewAccordion options={QUICK_CHIPS} onComplete={onComplete} />
      );
      clickQuickChip(MOOD_COMPLAINT.label);
      fireEvent.click(screen.getByText(MOOD_COMPLAINT.options[0].label));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step editing', () => {
    it('clicking edit on step 1 reopens it and resets step 2', () => {
      const onComplete = vi.fn();
      render(
        <InterviewAccordion options={QUICK_CHIPS} onComplete={onComplete} />
      );
      clickQuickChip(MOOD_COMPLAINT.label);
      // Step 2 opened
      expect(screen.getByText(/which best describes/i)).toBeInTheDocument();
      // Click edit to reopen step 1
      fireEvent.click(screen.getByTestId('step-1-edit'));
      // Quick Selection chips reappear
      expect(screen.getByText('Quick Selection')).toBeInTheDocument();
      // Step 2 options should no longer be visible
      expect(
        screen.queryByText(/which best describes/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('No close button', () => {
    it('does not render any close (✕) button', () => {
      render(<InterviewAccordion options={QUICK_CHIPS} onComplete={vi.fn()} />);
      expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument();
    });
  });
});
