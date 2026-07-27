import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildCardStyles, injectCardStyles } from '../injectCardStyles';

describe('buildCardStyles', () => {
  it('generates CSS with active, answered, and future states', () => {
    const css = buildCardStyles({
      activeLinkId: 'q2',
      answeredLinkIds: ['q1'],
      futureLinkIds: ['q3'],
      displayItemLinkIds: ['inst']
    });

    expect(css).toContain('.card-stack-viewport');
    expect(css).toContain('.card-question-container');
    expect(css).toContain('.card-answered');
    expect(css).toContain('.card-active');
    expect(css).toContain('.card-future');
    expect(css).toContain('.card-display-item');
  });

  it('handles null activeLinkId (all answered)', () => {
    const css = buildCardStyles({
      activeLinkId: null,
      answeredLinkIds: ['q1', 'q2'],
      futureLinkIds: [],
      displayItemLinkIds: []
    });

    expect(css).toContain('.card-future');
    expect(css).not.toContain('.card-active');
  });

  it('includes transition with cubic-bezier', () => {
    const css = buildCardStyles({
      activeLinkId: 'q1',
      answeredLinkIds: [],
      futureLinkIds: [],
      displayItemLinkIds: []
    });

    expect(css).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
  });
});

describe('injectCardStyles', () => {
  beforeEach(() => {
    // Remove any leftover style elements
    document.head
      .querySelectorAll('style[data-card-stack]')
      .forEach(el => el.remove());
  });

  afterEach(() => {
    document.head
      .querySelectorAll('style[data-card-stack]')
      .forEach(el => el.remove());
  });

  it('injects a style element with data-card-stack attribute', () => {
    const cleanup = injectCardStyles({
      activeLinkId: 'q1',
      answeredLinkIds: [],
      futureLinkIds: [],
      displayItemLinkIds: []
    });

    const style = document.head.querySelector('style[data-card-stack]');
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('.card-stack-viewport');

    cleanup();
  });

  it('cleanup removes the style element', () => {
    const cleanup = injectCardStyles({
      activeLinkId: 'q1',
      answeredLinkIds: [],
      futureLinkIds: [],
      displayItemLinkIds: []
    });

    expect(
      document.head.querySelector('style[data-card-stack]')
    ).not.toBeNull();

    cleanup();

    expect(document.head.querySelector('style[data-card-stack]')).toBeNull();
  });

  it('replaces existing card-stack style on second injection', () => {
    const cleanup1 = injectCardStyles({
      activeLinkId: 'q1',
      answeredLinkIds: [],
      futureLinkIds: [],
      displayItemLinkIds: []
    });

    const style1 = document.head.querySelector('style[data-card-stack]');

    const cleanup2 = injectCardStyles({
      activeLinkId: 'q2',
      answeredLinkIds: ['q1'],
      futureLinkIds: [],
      displayItemLinkIds: []
    });

    const style2 = document.head.querySelector('style[data-card-stack]');
    expect(style2).not.toBeNull();
    // Should be the same element (replaced, not duplicated)
    expect(style2).toBe(style1);

    cleanup1();
    cleanup2();
  });
});
