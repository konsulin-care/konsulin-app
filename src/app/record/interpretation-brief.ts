import type { Interpretation } from '@/lib/interpretation';

/** Block with a bold title line followed by its body line. */
function titledBlock(title: string, body: string): string {
  return `**${title}**\n${body}`;
}

/**
 * Turns an engine reading into the markdown brief shown on the record page.
 *
 * The engine returns message keys only, so every part is resolved through the
 * given translator. Order matches the reading: flags first (they are safety
 * critical), then printable scale readings, then the combined outcome, then
 * notes. Scales without copy (no band, or `reading: false`) are skipped.
 *
 * @param reading - Interpretation produced by `interpret()`, or null.
 * @param t - Translator for the `interpretation` message namespace.
 * @returns Markdown brief, or null when there is nothing to print.
 */
export function buildInterpretationBrief(
  reading: Interpretation | null,
  t: (key: string) => string
): string | null {
  if (!reading) return null;

  const parts: string[] = [];

  for (const flagKey of reading.flagKeys) {
    parts.push(t(flagKey));
  }

  for (const scale of reading.scales) {
    if (!scale.titleKey || !scale.bodyKey) continue;
    parts.push(titledBlock(t(scale.titleKey), t(scale.bodyKey)));
  }

  if (reading.combined) {
    parts.push(
      titledBlock(t(reading.combined.titleKey), t(reading.combined.bodyKey))
    );
  }

  for (const noteKey of reading.noteKeys) {
    parts.push(t(noteKey));
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}
