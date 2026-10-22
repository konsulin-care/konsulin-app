import { describe, expect, it, vi } from 'vitest';

// Mock next/dynamic to verify options passed
vi.mock('next/dynamic', () => {
  let capturedOptions: Record<string, unknown> = {};
  const mockDynamic = (_loader: unknown, options?: Record<string, unknown>) => {
    capturedOptions = options ?? {};
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

import type { ComponentType } from 'react';
import {
  lazyComponent,
  resolveCjsDefaultExport,
  withChunkRetry
} from '../lib/lazy-component';

type ComponentWithCapture = ReturnType<typeof lazyComponent> & {
  _capturedOptions?: { ssr?: boolean; loading?: () => React.ReactNode };
};

function createChunkError(msg?: string): Error {
  const err = new Error(
    msg ?? 'Loading chunk test.js failed.\n(missing: http://localhost/test.js)'
  );
  err.name = 'ChunkLoadError';
  return err;
}

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

describe('withChunkRetry', () => {
  it('retries on ChunkLoadError and succeeds', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(createChunkError())
      .mockResolvedValueOnce({
        default: (() => null) as ComponentType<unknown>
      });

    const retryLoader = withChunkRetry(loader);
    const result = await retryLoader();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(result).toHaveProperty('default');
  });

  it('throws immediately for non-chunk errors', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('Network error'));

    const retryLoader = withChunkRetry(loader);

    await expect(retryLoader()).rejects.toThrow('Network error');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries', async () => {
    const loader = vi.fn().mockRejectedValue(createChunkError());

    const retryLoader = withChunkRetry(loader);

    await expect(retryLoader()).rejects.toMatchObject({
      name: 'ChunkLoadError'
    });
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('does not retry on success', async () => {
    const loader = vi
      .fn()
      .mockResolvedValue({ default: (() => null) as ComponentType<unknown> });

    const retryLoader = withChunkRetry(loader);
    const result = await retryLoader();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('default');
  });
});

describe('resolveCjsDefaultExport', () => {
  const TestComponent = () => null;

  it('extracts default from a normal ESM module object', () => {
    const mod = { default: TestComponent };
    expect(resolveCjsDefaultExport(mod)).toBe(TestComponent);
  });

  it('unwraps nested default from CJS webpack interop', () => {
    const mod = { default: { default: TestComponent } };
    expect(resolveCjsDefaultExport(mod)).toBe(TestComponent);
  });

  it('unwraps nested default with __esModule flag', () => {
    const mod = {
      default: {
        default: TestComponent,
        __esModule: true,
        useTopLoader: () => null
      }
    };
    expect(resolveCjsDefaultExport(mod)).toBe(TestComponent);
  });

  it('falls back to module itself when no default exists', () => {
    const mod = TestComponent;
    expect(resolveCjsDefaultExport(mod)).toBe(TestComponent);
  });

  it('returns null for null input', () => {
    expect(resolveCjsDefaultExport(null)).toBeNull();
  });

  it('returns undefined for undefined input', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicit undefined input under test
    expect(resolveCjsDefaultExport(undefined)).toBeUndefined();
  });
});
