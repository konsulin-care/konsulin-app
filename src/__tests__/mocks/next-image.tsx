/**
 * Factory for a vi.mock()-compatible next/image mock.
 *
 * Returns an object that, when passed to `vi.mock('next/image', factory)`,
 * replaces next/image with a plain `<img>` element.  Next.js-specific props
 * (`fill`, `priority`, `loading`, `placeholder`, `blurDataURL`,
 * `onLoadingComplete`, `onError`) are discarded to prevent React DOM
 * unknown-attribute warnings during tests.
 *
 * @example
 * ```ts
 * import { createNextImageMock } from '@/__tests__/mocks/next-image';
 * vi.mock('next/image', createNextImageMock);
 * ```
 */
export function createNextImageMock() {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      const SAFE_ATTRS = new Set([
        'src',
        'alt',
        'className',
        'style',
        'width',
        'height',
        'id',
        'title',
        'lang',
        'dir',
        'hidden',
        'slot',
        'data-testid',
        'aria-label',
        'aria-hidden',
        'role',
        'tabIndex',
        'crossOrigin',
        'decoding',
        'referrerPolicy',
        'sizes',
        'srcSet',
        'useMap'
      ]);
      const safeProps: Record<string, unknown> = {};
      for (const key of Object.keys(props)) {
        if (SAFE_ATTRS.has(key)) safeProps[key] = props[key];
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img data-testid='next-image' alt='' {...safeProps} />
      );
    }
  };
}
