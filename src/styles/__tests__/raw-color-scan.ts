interface RawColorPattern {
  name: string;
  pattern: RegExp;
}

interface RawColorFinding {
  pattern: string;
  line: number;
  match: string;
}

/**
 * Guards for hard-coded colours and off-scale utilities that the design-token
 * sweep must remove from call sites.
 */
export const RAW_COLOR_PATTERNS: RawColorPattern[] = [
  { name: 'six-digit-hex', pattern: /#[0-9a-fA-F]{6}\b/ },
  { name: 'text-10-11px', pattern: /text-\[1[01]px\]/ },
  {
    name: 'legacy-css-var',
    pattern: /var\(--(secondary|soft-gray|muted|primary|border)\)/
  },
  {
    name: 'neutral-utility',
    pattern: /\b(text|bg|border)-(gray|slate)-\d{2,3}\b/
  },
  { name: 'bg-white', pattern: /\bbg-white\b/ },
  { name: 'text-black', pattern: /\btext-black\b/ },
  { name: 'text-teal', pattern: /\btext-teal-\d{2,3}\b/ },
  { name: 'text-secondary', pattern: /\btext-secondary(?![\w-])/ },
  {
    name: 'status-utility',
    pattern: /\b(text|bg|border)-(red|amber|green|blue)-\d{2,3}\b/
  },
  {
    name: 'dead-scale-utility',
    pattern:
      /\b(?:text|bg|border|ring|from|to|via|fill|stroke|outline|divide|placeholder)-(?:primary|secondary|accent|card|popover|muted|border|input|foreground|background|danger|warning|success|destructive|turquoise)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/
  }
];

/**
 * Scans source text for every pattern in {@link RAW_COLOR_PATTERNS}.
 *
 * @param text - Source file contents to scan.
 * @returns One finding per match, with the pattern name, 1-based line number
 *   and the matched text.
 */
export function scanSource(text: string): RawColorFinding[] {
  return scanText(text, RAW_COLOR_PATTERNS);
}

/**
 * Guards for stylesheets, where design tokens must replace raw colours and
 * legacy CSS variable aliases.
 */
export const STYLESHEET_PATTERNS: RawColorPattern[] = [
  { name: 'six-digit-hex', pattern: /#[0-9a-fA-F]{6}\b/ },
  {
    name: 'legacy-css-var',
    pattern: /var\(--(secondary|soft-gray|muted|primary|border)\)/
  }
];

/**
 * Scans stylesheet text for raw six-digit hex colours and legacy CSS variable
 * reads.
 *
 * @param text - Stylesheet contents to scan.
 * @returns One finding per match, with the pattern name, 1-based line number
 *   and the matched text.
 */
export function scanStylesheet(text: string): RawColorFinding[] {
  return scanText(text, STYLESHEET_PATTERNS);
}

/**
 * Applies the given patterns line by line so findings carry line numbers.
 *
 * @param text - Source text to scan.
 * @param patterns - Patterns to match against each line.
 * @returns One finding per match.
 */
function scanText(
  text: string,
  patterns: RawColorPattern[]
): RawColorFinding[] {
  const findings: RawColorFinding[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const { name, pattern } of patterns) {
      const matcher = new RegExp(
        pattern.source,
        pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
      );
      for (const match of line.matchAll(matcher)) {
        findings.push({
          pattern: name,
          line: index + 1,
          match: match[0]
        });
      }
    }
  });

  return findings;
}
