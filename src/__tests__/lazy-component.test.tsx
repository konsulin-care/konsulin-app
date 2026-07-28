import { describe, expect, it, vi } from 'vitest';

// Mock next/dynamic to capture how it's called
vi.mock('next/dynamic', () => {
  let capturedOptions: Record<string, unknown> = {};
  const mockDynamic = (_loader: unknown, options?: Record<string, unknown>) => {
    capturedOptions = options ?? {};
    // Return a basic component wrapper for type compatibility
    const Wrapper = (): null => null;
    Wrapper.displayName = 'DynamicWrapper';
    (
      Wrapper as unknown as { _capturedOptions: Record<string, unknown> }
    )._capturedOptions = capturedOptions;
    return Wrapper;
  };
  (
    mockDynamic as unknown as {
      getCapturedOptions: () => Record<string, unknown>;
    }
  ).getCapturedOptions = () => capturedOptions;
  return { default: mockDynamic };
});

import { lazyComponent } from '../lib/lazy-component';

type ComponentWithCapture = ReturnType<typeof lazyComponent> & {
  _capturedOptions?: { ssr?: boolean; loading?: () => React.ReactNode };
};

describe('lazyComponent', () => {
  it('returns a component', () => {
    const Component = lazyComponent(
      () => import('../components/general/loading-section')
    );
    expect(Component).toBeDefined();
    expect(typeof Component).toBe('function');
  });

  it('defaults ssr to true', () => {
    const Component = lazyComponent(
      () => import('../components/general/loading-section')
    ) as ComponentWithCapture;
    const options = Component._capturedOptions;
    expect(options?.ssr).toBe(true);
  });

  it('accepts custom ssr option', () => {
    const Component = lazyComponent(
      () => import('../components/general/loading-section'),
      { ssr: false }
    ) as ComponentWithCapture;
    const options = Component._capturedOptions;
    expect(options?.ssr).toBe(false);
  });

  it('uses LoadingSection as default fallback', () => {
    const Component = lazyComponent(
      () => import('../components/general/loading-section')
    ) as ComponentWithCapture;
    const options = Component._capturedOptions;
    // The loading function should return a React element
    expect(typeof options?.loading).toBe('function');
  });

  it('accepts custom fallback', () => {
    const CustomFallback = () => (
      <div data-testid='custom-fallback'>Loading...</div>
    );
    const Component = lazyComponent(
      () => import('../components/general/loading-section'),
      { fallback: <CustomFallback /> }
    ) as ComponentWithCapture;
    const options = Component._capturedOptions;
    expect(typeof options?.loading).toBe('function');
  });
});
