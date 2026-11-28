import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditCard from '../edit-card';
import ExportCard from '../export-card';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const STUDY_ID = 'study-x';

/** Counts the interactive controls (buttons and links) in the document. */
function countControls(): number {
  return (
    screen.queryAllByRole('button').length +
    screen.queryAllByRole('link').length
  );
}

describe('EditCard', () => {
  it('renders one default-variant link to the edit title page', () => {
    render(<EditCard studyId={STUDY_ID} />);

    expect(
      screen.getByRole('heading', { name: 'Edit study' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Title, questionnaires and batches. Batches that have started are locked.'
      )
    ).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Edit study' });
    expect(link).toHaveAttribute(
      'href',
      `/research/edit?id=${STUDY_ID}&page=title`
    );
    expect(link).toHaveClass('bg-primary', 'w-full', 'min-h-11');
  });

  it('renders exactly one button or link', () => {
    render(<EditCard studyId={STUDY_ID} />);

    expect(countControls()).toBe(1);
  });
});

describe('ExportCard', () => {
  it('renders one default-variant export button', () => {
    render(<ExportCard />);

    expect(
      screen.getByRole('heading', { name: 'Export data' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Download participant answers, anonymised.')
    ).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Export data' });
    expect(button).toHaveClass('bg-primary');
  });

  it('shows the inline coming-soon banner when clicked', () => {
    render(<ExportCard />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export data' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Export is coming soon.'
    );
  });

  it('renders exactly one button or link', () => {
    render(<ExportCard />);

    expect(countControls()).toBe(1);
  });
});
