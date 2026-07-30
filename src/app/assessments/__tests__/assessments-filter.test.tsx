import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssessmentsFilter from '../assessments-filter';

describe('AssessmentsFilter', () => {
  it('renders the filter trigger button', () => {
    render(<AssessmentsFilter onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens drawer when trigger clicked', () => {
    render(<AssessmentsFilter onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('shows all 7 category options in the drawer', () => {
    render(<AssessmentsFilter onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Physical Health')).toBeInTheDocument();
    expect(screen.getByText('Mental & Emotional Health')).toBeInTheDocument();
    expect(
      screen.getByText('Social Health & Relationships')
    ).toBeInTheDocument();
    expect(screen.getByText('Functional Capacity')).toBeInTheDocument();
    expect(
      screen.getByText('Meaning, Purpose & Fulfilment')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Health Behaviours & Lifestyle')
    ).toBeInTheDocument();
    expect(screen.getByText('Environmental & Contextual')).toBeInTheDocument();
  });

  it('shows sort options in the drawer', () => {
    render(<AssessmentsFilter onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('A–Z')).toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('calls onChange with selected categories when applying filter', () => {
    const onChange = vi.fn();
    render(<AssessmentsFilter onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));

    // Select "Sleep & Fatigue" checkbox
    const checkbox = screen.getByLabelText('Physical Health');
    fireEvent.click(checkbox);

    // Apply
    fireEvent.click(screen.getByText('Apply'));

    expect(onChange).toHaveBeenCalledWith({
      categories: ['physical-health'],
      sort: 'a-z'
    });
  });

  it('calls onChange with default values when applying without changes', () => {
    const onChange = vi.fn();
    render(<AssessmentsFilter onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Apply'));

    expect(onChange).toHaveBeenCalledWith({
      categories: [],
      sort: 'a-z'
    });
  });

  it('calls onChange with changed sort when selected', () => {
    const onChange = vi.fn();
    render(<AssessmentsFilter onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));

    // Select "Most Popular" sort
    fireEvent.click(screen.getByText('Most Popular'));
    fireEvent.click(screen.getByText('Apply'));

    expect(onChange).toHaveBeenCalledWith({
      categories: [],
      sort: 'popular'
    });
  });
});
