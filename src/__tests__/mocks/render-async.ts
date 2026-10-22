import { act, render } from '@testing-library/react';
import type React from 'react';

/**
 * Renders an async server component by resolving its Promise first.
 *
 * Async server components return a Promise when called; the helper unwraps
 * that Promise, renders the resolved element inside `act`, and returns the
 * standard render result.
 *
 * @param element - Root React element whose type is a Promise-returning
 * async server component.
 * @returns The Testing Library render result for the resolved element.
 */
export async function renderAsync(
  element: React.ReactElement
): Promise<ReturnType<typeof render>> {
  // Async server components return a Promise; unwrap before rendering.
  const type = element.type as unknown as (
    ...args: unknown[]
  ) => Promise<React.ReactElement>;
  const resolved = await type(element.props);
  let result!: ReturnType<typeof render>;
  act(() => {
    result = render(resolved);
  });
  return result;
}
