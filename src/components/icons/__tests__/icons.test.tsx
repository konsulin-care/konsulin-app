import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FilterIcon from '../filter-icon';
import HouseIcon from '../house-icon';
import LiteratureIcon from '../literature-icon';
import LoadingSpinnerIcon from '../loading-spinner-icon';
import NoteIcon from '../note-icon';
import OfficeIcon from '../office-icon';
import UserIcon from '../user-icon';

describe('icons', () => {
  it('renders FilterIcon paths with fill currentColor by default', () => {
    const { container } = render(<FilterIcon />);
    const paths = Array.from(container.querySelectorAll('path'));

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.getAttribute('fill')).toBe('currentColor');
    }
  });

  it('renders HouseIcon paths with currentColor by default', () => {
    const { container } = render(<HouseIcon />);
    const paths = Array.from(container.querySelectorAll('path[stroke]'));

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.getAttribute('stroke')).toBe('currentColor');
    }
  });

  it('renders LiteratureIcon paths with currentColor by default', () => {
    const { container } = render(<LiteratureIcon />);
    const paths = Array.from(container.querySelectorAll('path'));

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.getAttribute('stroke')).toBe('currentColor');
    }
  });

  it('renders OfficeIcon paths with currentColor by default', () => {
    const { container } = render(<OfficeIcon />);
    const paths = Array.from(container.querySelectorAll('path[stroke]'));

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.getAttribute('stroke')).toBe('currentColor');
    }
  });

  it('renders UserIcon paths with currentColor by default', () => {
    const { container } = render(<UserIcon />);
    const paths = Array.from(container.querySelectorAll('path[stroke]')).filter(
      path => path.getAttribute('stroke') !== 'white'
    );

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.getAttribute('stroke')).toBe('currentColor');
    }
  });

  it('renders LoadingSpinnerIcon with currentColor stroke and turquoise class', () => {
    const { container } = render(<LoadingSpinnerIcon />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.getAttribute('class')).toContain('text-turquoise-deep');
    expect(svg?.getAttribute('class')).toContain('animate-spin');
  });

  it('renders NoteIcon with currentColor and merged turquoise class', () => {
    const { container } = render(<NoteIcon className='size-6' />);
    const svg = container.querySelector('svg');
    const path = container.querySelector('path');

    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('class')).toContain('text-turquoise-deep');
    expect(svg?.getAttribute('class')).toContain('size-6');
    expect(path?.getAttribute('fill')).toBe('currentColor');
  });
});
