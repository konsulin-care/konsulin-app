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
      // Collect only standard HTML img attributes, skipping next/image-specific ones
      const imgProps: Record<string, unknown> = {};
      for (const key of Object.keys(props)) {
        if (
          key !== 'fill' &&
          key !== 'priority' &&
          key !== 'loading' &&
          key !== 'placeholder' &&
          key !== 'blurDataURL' &&
          key !== 'onLoadingComplete' &&
          key !== 'onError'
        ) {
          imgProps[key] = props[key];
        }
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgProps.src as string}
          alt={imgProps.alt as string}
          data-testid='next-image'
          {...imgProps}
        />
      );
    }
  };
}
