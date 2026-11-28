import { fireEvent, render, screen } from '@testing-library/react';
import type { ResearchStudy } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FindingComposer from '../finding-composer';

const { mockUseStudyParticipantCount, mockMutate, mockUsePostFinding } =
  vi.hoisted(() => ({
    mockUseStudyParticipantCount: vi.fn(),
    mockMutate: vi.fn(),
    mockUsePostFinding: vi.fn()
  }));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/services/api/research-counts', () => ({
  useStudyParticipantCount: () => mockUseStudyParticipantCount()
}));

vi.mock('@/services/api/research-findings', () => {
  class StudyConflictError extends Error {}
  return {
    StudyConflictError,
    usePostFinding: () => mockUsePostFinding()
  };
});

const STUDY: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'study-1',
  status: 'active',
  title: 'Sleep and Mood',
  principalInvestigator: {
    reference: 'Practitioner/p1',
    display: 'Dr. Ani'
  }
};

/**
 * Configures the post-finding mutation mock.
 *
 * @param state - Partial mutation state merged over the defaults.
 * @returns Nothing.
 */
function setMutationState(state: Record<string, unknown>) {
  mockUsePostFinding.mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    error: null,
    ...state
  });
}

describe('FindingComposer', () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockUseStudyParticipantCount.mockReset();
    mockUsePostFinding.mockReset();
    mockUseStudyParticipantCount.mockReturnValue({
      data: 12,
      isLoading: false
    });
    setMutationState({});
  });

  it('prefills the count field with the current participant count', () => {
    render(<FindingComposer study={STUDY} />);

    const count = screen.getByLabelText('Based on how many participants?');

    expect(count).toHaveValue(12);
  });

  it('disables Post while the text is empty and posts text and count', () => {
    render(<FindingComposer study={STUDY} />);
    const post = screen.getByRole('button', { name: 'Post to participants' });

    expect(post).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText('What did you learn, and how sure are you?'),
      { target: { value: 'Sleep improved for most participants.' } }
    );
    expect(post).toBeEnabled();
    fireEvent.click(post);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        studyId: 'study-1',
        text: 'Sleep improved for most participants.',
        participantCount: 12
      })
    );
  });

  it('shows a role=status confirmation after a successful post', () => {
    setMutationState({ isSuccess: true });

    render(<FindingComposer study={STUDY} />);

    expect(screen.getByRole('status')).toHaveTextContent('Finding posted.');
  });

  it('uses the action variant when primary and the default variant otherwise', () => {
    const { rerender } = render(<FindingComposer study={STUDY} primary />);

    expect(
      screen.getByRole('button', { name: 'Post to participants' })
    ).toHaveClass('bg-secondary');

    rerender(<FindingComposer study={STUDY} />);

    expect(
      screen.getByRole('button', { name: 'Post to participants' })
    ).toHaveClass('bg-primary');
  });
});
