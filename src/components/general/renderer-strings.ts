import type { RendererStrings } from '@aehrc/smart-forms-renderer';

/**
 * Builds localized renderer strings for the smart forms renderer.
 *
 * @param t - Translator scoped to the `common` namespace.
 * @returns Partial renderer strings.
 */
export function buildRendererStrings(
  t: (key: string) => string
): Partial<RendererStrings> {
  return { clear: t('renderer.clear') };
}
