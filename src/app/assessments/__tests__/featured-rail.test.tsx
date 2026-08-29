import { fireEvent, render, screen } from '@testing-library/react';
import type { Questionnaire } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import FeaturedRail from '../featured-rail';

function createQuestionnaire(id: string, title: string): Questionnaire {
  return {
    resourceType: 'Questionnaire',
    id,
    title,
    status: 'active'
  };
}

describe('FeaturedRail', () => {
  it('renders section header', () => {
    render(
      <FeaturedRail
        questionnaires={[createQuestionnaire('q1', 'PHQ-9')]}
        onAssessmentClick={vi.fn()}
      />
    );
    expect(screen.getByText("Editor's Picks")).toBeInTheDocument();
  });

  it('renders nothing when list is empty', () => {
    const { container } = render(
      <FeaturedRail questionnaires={[]} onAssessmentClick={vi.fn()} />
    );
    // Component returns null — no content rendered
    expect(container.textContent).toBe('');
  });

  it('renders cards for each questionnaire', () => {
    const items = [
      createQuestionnaire('q1', 'PHQ-9'),
      createQuestionnaire('q2', 'GAD-7')
    ];
    render(<FeaturedRail questionnaires={items} onAssessmentClick={vi.fn()} />);
    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    expect(screen.getByText('GAD-7')).toBeInTheDocument();
  });

  it('calls onAssessmentClick when a card is clicked', () => {
    const onClick = vi.fn();
    const items = [createQuestionnaire('q1', 'PHQ-9')];
    render(<FeaturedRail questionnaires={items} onAssessmentClick={onClick} />);
    // Find the button by its accessible name (title)
    fireEvent.click(screen.getByRole('button', { name: /PHQ-9/ }));
    expect(onClick).toHaveBeenCalledWith(items[0]);
  });

  it('renders correct number of cards', () => {
    const items = [
      createQuestionnaire('q1', 'A'),
      createQuestionnaire('q2', 'B'),
      createQuestionnaire('q3', 'C')
    ];
    render(<FeaturedRail questionnaires={items} onAssessmentClick={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });
});
