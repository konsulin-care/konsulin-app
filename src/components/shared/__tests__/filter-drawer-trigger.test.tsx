import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import FilterDrawerTrigger from '../filter-drawer-trigger';

describe('FilterDrawerTrigger', () => {
  it('forwards ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>();

    render(<FilterDrawerTrigger ref={ref} onClick={vi.fn()} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
