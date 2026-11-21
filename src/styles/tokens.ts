/**
 * Hex mirrors of the colour tokens declared in the `@theme` block of
 * `src/styles/globals.css`.
 *
 * Tailwind utilities resolve the CSS variables themselves; this module exists
 * for consumers that cannot read CSS variables (MUI, SuperTokens, NextTopLoader).
 * `tokens.test.ts` keeps both sources in sync.
 */
export const TOKENS = {
  charcoal900: '#161C26',
  charcoal700: '#484D54',
  charcoal600: '#686C72',
  charcoal400: '#8D8F93',
  charcoal200: '#DADBDB',
  charcoal100: '#ECEDEB',
  paper: '#FAFAF8',
  surface: '#FFFFFF',
  turquoise: '#0ABDC3',
  turquoiseTint: '#D8F1F1',
  turquoiseDeep: '#0F7981',
  danger: '#B3261E',
  dangerTint: '#FBEAE8',
  warning: '#F2B705',
  warningDeep: '#7A5200',
  warningTint: '#FDF3D7'
} as const;
