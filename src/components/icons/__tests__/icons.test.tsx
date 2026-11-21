import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FilterIcon from '../filter-icon';
import HouseIcon from '../house-icon';
import LiteratureIcon from '../literature-icon';

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
});
