import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContentWraper from '../content-wraper';

describe('ContentWraper', () => {
  it('uses the background token with a top hairline and no bg-white', () => {
    const { container } = render(
      <ContentWraper>
        <p>content</p>
      </ContentWraper>
    );

    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    expect(root).toHaveClass('bg-background');
    expect(root).toHaveClass('border-t');
    expect(root).toHaveClass('border-border');
    expect(root).not.toHaveClass('bg-white');
  });

  it('renders its children', () => {
    render(
      <ContentWraper>
        <p>content</p>
      </ContentWraper>
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
