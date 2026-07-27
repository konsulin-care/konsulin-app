'use client';

const STYLE_ATTR = 'data-card-stack';

interface CardStyleParams {
  activeLinkId: string | null;
  answeredLinkIds: string[];
  futureLinkIds: string[];
  displayItemLinkIds: string[];
}

/**
 * Generate CSS string for the card stack.
 *
 * Returns dynamic styles based on which linkIds are active, answered,
 * future, or display items.
 */
export function buildCardStyles(params: CardStyleParams): string {
  const hasActive = params.activeLinkId !== null;

  const secondaryColor = 'var(--color-secondary, #13c2c2)';

  return `
.card-stack-viewport {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

.card-stack-viewport [id^="label-"] {
  container-type: inline-size;
}

.card-question-container {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  scroll-snap-align: center;
  scroll-margin: 48px 0;
  flex-shrink: 0;
}

.card-answered {
  opacity: 0.5;
  scale: 0.95;
  border-right: 3px solid ${secondaryColor};
}

${
  hasActive
    ? `.card-active {
  opacity: 1;
  scale: 1;
  border-right: 4px solid ${secondaryColor};
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  z-index: 2;
}

.card-active .MuiSvgIcon-colorSuccess {
  color: ${secondaryColor} !important;
}`
    : ''
}

.card-future {
  opacity: 0.5;
  scale: 0.95;
  border-right: 3px solid #ccc;
}

/* Hide answer options on peek cards */
.card-answered .MuiRadioGroup-root,
.card-future .MuiRadioGroup-root {
  display: none;
}

/* Hide SyncIcon on peek cards (border serves as indicator) */
.card-answered .MuiSvgIcon-colorSuccess,
.card-future .MuiSvgIcon-colorSuccess {
  display: none;
}

.card-display-item {
  scroll-snap-align: none;
  opacity: 1 !important;
  scale: 1 !important;
  max-height: none !important;
  pointer-events: auto !important;
  margin: 0 !important;
}
`;
}

/**
 * Inject card stack CSS into document head.
 *
 * Replaces any existing card-stack style element to avoid duplicates.
 * Returns a cleanup function that removes the injected style.
 */
export function injectCardStyles(params: CardStyleParams): () => void {
  const attrSelector = `style[${CSS.escape(STYLE_ATTR)}]`;
  let style = document.head.querySelector<HTMLStyleElement>(attrSelector);

  if (!style) {
    style = document.createElement('style');
    style.setAttribute(STYLE_ATTR, '');
    document.head.append(style);
  }

  /** Cleanup: remove the card-stack style element. */

  style.textContent = buildCardStyles(params);

  return () => {
    style?.remove();
  };
}
