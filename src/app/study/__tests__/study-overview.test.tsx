import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudyOverview from '../study-overview';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('StudyOverview', () => {
  it('renders group and lead, title, question and description, omitting missing', () => {
    const { rerender } = render(
      <StudyOverview
        group='Lab'
        lead='Dr A'
        title='Sleep'
        headingLevel='h1'
        question='Why?'
        description='Desc'
      />
    );
    expect(screen.getByText('Lab · led by Dr A')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sleep');
    expect(screen.getByText('Why?')).toBeTruthy();
    expect(screen.getByText('Desc')).toBeTruthy();
    rerender(<StudyOverview title='Sleep' />);
    expect(screen.queryByText('Why?')).toBeNull();
    expect(screen.queryByText(/led by/)).toBeNull();
  });

  it('each fact hides when its value is unknown', () => {
    const { rerender } = render(<StudyOverview minutes={5} />);
    expect(screen.getByText('About 5 minutes')).toBeTruthy();
    expect(screen.queryByText('Kind of study')).toBeNull();
    rerender(<StudyOverview kind={{ kind: 'one-time' }} />);
    expect(screen.getByText('One-time study')).toBeTruthy();
    expect(screen.queryByText('Time needed')).toBeNull();
  });

  it('questionnaire done marks show only when the viewer has joined', () => {
    const qs = [{ id: 'q', title: 'PHQ', done: true }];
    const { container, rerender } = render(
      <StudyOverview questionnaires={qs} />
    );
    expect(container.textContent).not.toContain('✓');
    rerender(<StudyOverview questionnaires={qs} joined />);
    expect(container.textContent).toContain('✓');
  });
});
