import {
  getQuickComplaints,
  searchChiefComplaints
} from '@/utils/recommendation-interview';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComplaintSearch } from '../complaint-search';
import { EmergencyBanner } from '../emergency-banner';
import { InterviewFlow } from '../interview-flow';

const MOOD_COMPLAINT = searchChiefComplaints('low mood')[0];

describe('EmergencyBanner', () => {
  it('renders a tap-to-call link for every resource with a tel: href', () => {
    render(
      <EmergencyBanner
        resources={[
          { name: 'Sehat Jiwa (Kemenkes)', phone: '119', extension: '8' },
          { name: 'Emergency Nasional', phone: '112' }
        ]}
      />
    );
    const callLinks = screen.getAllByRole('link');
    expect(callLinks).toHaveLength(2);
    expect(callLinks[0]).toHaveAttribute('href', 'tel:119,8');
    expect(callLinks[1]).toHaveAttribute('href', 'tel:112');
    expect(screen.getByText('Sehat Jiwa (Kemenkes)')).toBeInTheDocument();
  });

  it('shows the non-blocking nudge copy', () => {
    render(<EmergencyBanner resources={[{ name: '112', phone: '112' }]} />);
    expect(
      screen.getByText(/You can call this hotline if you need to/i)
    ).toBeInTheDocument();
  });
});

describe('ComplaintSearch', () => {
  it('renders the top-5 quick chips', () => {
    render(<ComplaintSearch onSelect={vi.fn()} />);
    for (const complaint of getQuickComplaints()) {
      expect(
        screen.getByRole('button', { name: complaint.label })
      ).toBeDefined();
    }
  });

  it('emits the complaint when a quick chip is tapped', () => {
    const onSelect = vi.fn();
    render(<ComplaintSearch onSelect={onSelect} />);
    const chip = getQuickComplaints()[2];
    fireEvent.click(screen.getByRole('button', { name: chip.label }));
    expect(onSelect).toHaveBeenCalledWith(chip);
  });

  it('suggests complaints from Indonesian synonyms as the user types', () => {
    render(<ComplaintSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'cemas' }
    });
    expect(screen.getByText('Anxiety, Stress & Panic')).toBeInTheDocument();
  });

  it('shows a graceful fallback for a dead-end search', () => {
    render(<ComplaintSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'zzz-no-such-topic' }
    });
    expect(screen.getByText(/no matching concern found/i)).toBeInTheDocument();
  });
});

describe('InterviewFlow', () => {
  it('shows the chief complaint options (at most 7) on the first screen', () => {
    render(
      <InterviewFlow open complaint={MOOD_COMPLAINT} onComplete={vi.fn()} />
    );
    for (const option of MOOD_COMPLAINT.options) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }
    expect(MOOD_COMPLAINT.options.length).toBeLessThanOrEqual(7);
  });

  it('keeps "Other" as the last option', () => {
    const otherIndex = MOOD_COMPLAINT.options.findIndex(o => o.isOther);
    expect(otherIndex).toBe(MOOD_COMPLAINT.options.length - 1);
  });

  it('moves to the red flag screen after selecting an option', () => {
    render(
      <InterviewFlow open complaint={MOOD_COMPLAINT} onComplete={vi.fn()} />
    );
    fireEvent.click(screen.getByText(MOOD_COMPLAINT.options[0].label));
    expect(screen.getByText(MOOD_COMPLAINT.redFlag.label)).toBeInTheDocument();
  });

  it('completes with the deterministic result when the user is safe', () => {
    const onComplete = vi.fn();
    render(
      <InterviewFlow open complaint={MOOD_COMPLAINT} onComplete={onComplete} />
    );
    fireEvent.click(screen.getByText(MOOD_COMPLAINT.options[0].label));
    fireEvent.click(screen.getByText("No, I'm safe"));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      specialty: '2084P0800X',
      serviceTypeCode: 'mood-disorder-care',
      icfDomain: 'mental-emotional-health'
    });
  });

  it('nudges with the emergency banner but still completes on a red flag', () => {
    const onComplete = vi.fn();
    render(
      <InterviewFlow open complaint={MOOD_COMPLAINT} onComplete={onComplete} />
    );
    fireEvent.click(screen.getByText(MOOD_COMPLAINT.options[0].label));
    fireEvent.click(screen.getByText("Yes, that's me"));
    // Banner nudges but the follow-up CTA still emits the result.
    expect(screen.getByTestId('emergency-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/show me recommendations/i));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
