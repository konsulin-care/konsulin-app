import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuestionnaireChip from '../questionnaire-chip';

describe('QuestionnaireChip', () => {
  it('renders the name', () => {
    render(<QuestionnaireChip name='GAD-7' onRemove={vi.fn()} />);

    expect(screen.getByText('GAD-7')).toBeInTheDocument();
  });

  it('renders duration when provided', () => {
    render(<QuestionnaireChip name='GAD-7' duration={5} onRemove={vi.fn()} />);

    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  it('renders category when provided', () => {
    render(
      <QuestionnaireChip
        name='GAD-7'
        category='Mental Health'
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Mental Health')).toBeInTheDocument();
  });

  it('renders both duration and category joined by dot', () => {
    render(
      <QuestionnaireChip
        name='GAD-7'
        duration={5}
        category='Mental Health'
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('5 min · Mental Health')).toBeInTheDocument();
  });

  it('hides metadata line when both duration and category are null', () => {
    const { container } = render(
      <QuestionnaireChip
        name='GAD-7'
        duration={null}
        category={null}
        onRemove={vi.fn()}
      />
    );

    // Only the title should be present, no metadata paragraph
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent('GAD-7');
  });

  it('hides metadata line when duration and category are undefined', () => {
    const { container } = render(
      <QuestionnaireChip name='GAD-7' onRemove={vi.fn()} />
    );

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
  });

  it('calls onRemove when CircleX button is clicked', () => {
    const onRemove = vi.fn();
    render(<QuestionnaireChip name='GAD-7' onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: /remove gad-7/i }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('has accessible remove button with aria-label', () => {
    render(<QuestionnaireChip name='SOAP Notes' onRemove={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /remove soap notes/i })
    ).toBeInTheDocument();
  });
});
