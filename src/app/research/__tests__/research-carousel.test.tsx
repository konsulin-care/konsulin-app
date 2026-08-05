import type { StudyProgress } from '@/utils/fhir/research';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchCarousel from '../research-carousel';
import { makeStudyB, makeStudyProgress } from './research-fixtures';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onClick
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  )
}));

function renderCarousel(
  studies: StudyProgress[],
  activeId: string,
  onSlideChange = vi.fn()
) {
  return render(
    <ResearchCarousel
      studies={studies}
      activeId={activeId}
      onSlideChange={onSlideChange}
      isPatient={false}
    />
  );
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL('https://konsulin.care/research')
  });
  Object.assign(navigator, { share: vi.fn().mockResolvedValue(void 0) });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ResearchCarousel', () => {
  it('renders the study data on its slide', () => {
    renderCarousel([makeStudyProgress()], 'research');

    expect(screen.getByText('Konsulin Mental Health Survey')).toBeTruthy();
    expect(
      screen.getByText(/A longitudinal survey of mental health/)
    ).toBeTruthy();
    expect(screen.getByText(/Closes in \d+ days/i)).toBeTruthy();
    expect(screen.getAllByText('1/2 questionnaires').length).toBeGreaterThan(0);
    expect(screen.getByTestId('batch-chip-batch-1')).toBeTruthy();
    expect(screen.getByText('PHQ2')).toBeTruthy();
    expect(screen.getByText('BIG FIVE INVENTORY')).toBeTruthy();
    expect(screen.getByText(/Tap card to share this study/i)).toBeTruthy();
  });

  it('shares the study URL when the slide is clicked', () => {
    const share = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, { share });
    renderCarousel([makeStudyProgress()], 'research');

    fireEvent.click(screen.getByTestId('research-slide-research'));

    expect(share).toHaveBeenCalledWith({
      url: 'https://konsulin.care/research?id=research'
    });
  });

  it('does not share when a questionnaire row is clicked', () => {
    const share = vi.fn().mockResolvedValue(void 0);
    Object.assign(navigator, { share });
    renderCarousel([makeStudyProgress()], 'research');

    fireEvent.click(screen.getByRole('link', { name: 'PHQ2' }));

    expect(share).not.toHaveBeenCalled();
  });

  it('marks the active slide', () => {
    renderCarousel([makeStudyProgress(), makeStudyB()], 'study-b');

    expect(screen.getByTestId('research-slide-study-b')).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(screen.getByTestId('research-slide-research')).toHaveAttribute(
      'data-active',
      'false'
    );
  });

  it('reports the study id when the active slide changes', () => {
    const onSlideChange = vi.fn();
    renderCarousel(
      [makeStudyProgress(), makeStudyB()],
      'research',
      onSlideChange
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));

    expect(onSlideChange).toHaveBeenCalledWith('study-b');
  });
});
