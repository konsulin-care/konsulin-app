import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageLayout from '../page-layout';

describe('PageLayout', () => {
  it('renders a root element whose data-layout equals the variant and defaults to narrow', () => {
    const { container, rerender } = render(
      <PageLayout>
        <p>content</p>
      </PageLayout>
    );

    expect(container.firstElementChild?.getAttribute('data-layout')).toBe(
      'narrow'
    );

    rerender(
      <PageLayout variant='wide'>
        <p>content</p>
      </PageLayout>
    );

    expect(container.firstElementChild?.getAttribute('data-layout')).toBe(
      'wide'
    );
  });

  it('the split variant renders the aside in a complementary aside element with hidden xl:block next to the children inside an xl two-column grid', () => {
    const { container } = render(
      <PageLayout variant='split' aside={<p>aside content</p>}>
        <p>main content</p>
      </PageLayout>
    );

    const root = container.firstElementChild;
    expect(root?.getAttribute('data-layout')).toBe('split');
    expect(root?.className).toContain('xl:grid');
    expect(root?.className).toContain('xl:grid-cols-[minmax(0,1fr)_320px]');
    expect(root?.className).toContain('xl:gap-6');

    const aside = screen.getByRole('complementary');
    expect(aside.tagName).toBe('ASIDE');
    expect(aside.className).toContain('hidden');
    expect(aside.className).toContain('xl:block');
    expect(aside.textContent).toContain('aside content');
    expect(aside.parentElement).toBe(root);

    const children = Array.from(root?.children ?? []);
    const childIndex = children.findIndex(
      node => node.textContent === 'main content'
    );
    expect(childIndex).toBeGreaterThanOrEqual(0);
    expect(children.indexOf(aside)).toBeGreaterThan(childIndex);
  });

  it('narrow and wide variants ignore the aside', () => {
    const { rerender, queryByRole } = render(
      <PageLayout variant='narrow' aside={<p>aside content</p>}>
        <p>main content</p>
      </PageLayout>
    );

    expect(queryByRole('complementary')).toBeNull();

    rerender(
      <PageLayout variant='wide' aside={<p>aside content</p>}>
        <p>main content</p>
      </PageLayout>
    );

    expect(queryByRole('complementary')).toBeNull();
  });
});
