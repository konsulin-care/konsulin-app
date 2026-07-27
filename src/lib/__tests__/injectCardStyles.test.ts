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

  describe('peek card styles', () => {
    it('removes max-height and overflow:hidden from peek cards', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      // Should NOT contain old truncation props
      expect(css).not.toContain('max-height: 56px');
      expect(css).not.toContain('overflow: hidden');
    });

    it('removes pointer-events:none from peek cards', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).not.toContain('pointer-events: none');
    });

    it('removes negative margins from peek cards', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).not.toContain('margin-bottom: -12px');
      expect(css).not.toContain('margin-top: -12px');
    });

    it('uses var(--color-secondary) for answered and active borders', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('var(--color-secondary, #13c2c2)');
      expect(css).not.toContain('#229954');
    });

    it('hides radio group on peek cards', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('.card-answered .MuiRadioGroup-root');
      expect(css).toContain('.card-future .MuiRadioGroup-root');
      expect(css).toContain('display: none');
    });

    it('hides SyncIcon on peek cards', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('.card-answered .MuiSvgIcon-colorSuccess');
      expect(css).toContain('.card-future .MuiSvgIcon-colorSuccess');
    });

    it('colors SyncIcon with secondary color on active card', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('.card-active .MuiSvgIcon-colorSuccess');
      expect(css).toContain('var(--color-secondary, #13c2c2)');
    });

    it('uses border-right for answered card indicator', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('.card-answered');
      expect(css).toContain('border-right: 3px solid');
      expect(css).not.toContain('border-left');
    });

    it('uses border-right for active card indicator', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('.card-active');
      expect(css).toContain('border-right: 4px solid');
    });

    it('uses border-right for future card indicator', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('.card-future');
      expect(css).toContain('border-right: 3px solid');
    });

    it('uses scale 0.95 for peek cards', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      // Old scale was 0.92, new scale is 0.95
      expect(css).toContain('scale: 0.95');
    });

    it('adds padding to card-question-container', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('.card-question-container');
      expect(css).toContain('padding: 12px 16px');
    });

    it('adds padding to card-stack-viewport', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('.card-stack-viewport');
      expect(css).toContain('padding: 0 16px');
    });

    it('hides scrollbar on card-stack-viewport', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toContain('scrollbar-width: none');
      expect(css).toContain('-ms-overflow-style: none');
    });

    it('overrides FullWidthFormComponentBox maxWidth to fix right gap asymmetry', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).toMatch(
        /data-test="q-item-choice-radio-answer-option-box"[^}]*max-width:\s*100%\s*!important/
      );
    });

    it('does not reset MuiCard-root padding', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).not.toMatch(/\.MuiCard-root[^}]*padding:\s*0\s*!important/);
    });

    it('does not add overflow-x hidden to card-stack-viewport', () => {
      const css = buildCardStyles({
        activeLinkId: 'q1',
        answeredLinkIds: ['q0'],
        futureLinkIds: ['q2'],
        displayItemLinkIds: []
      });

      expect(css).not.toContain('overflow-x: hidden');
    });
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
