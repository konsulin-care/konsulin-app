import {
  applySwUpdate,
  setupSwUpdateDetection,
  SKIP_WAITING_MESSAGE
} from '@/lib/sw-update';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-toastify', () => ({
  toast: { info: vi.fn(), dismiss: vi.fn() }
}));

function stubServiceWorker(sw: Record<string, unknown>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: sw
  });
}

type MockListenerFn = (type: string, handler: () => void) => void;

describe('setupSwUpdateDetection', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    });
  });

  it('shows an update toast when a new worker finishes installing', async () => {
    const worker = {
      addEventListener: vi.fn<MockListenerFn>(),
      state: 'installing'
    };
    const registration = {
      installing: worker,
      waiting: null,
      addEventListener: vi.fn<MockListenerFn>()
    };
    stubServiceWorker({
      ready: Promise.resolve(registration),
      controller: {},
      addEventListener: vi.fn()
    });

    const unsubscribe = setupSwUpdateDetection();

    await vi.waitFor(() => {
      expect(registration.addEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      );
    });
    const updateFoundHandler = registration.addEventListener.mock.calls[0][1];
    updateFoundHandler();

    expect(worker.addEventListener).toHaveBeenCalledWith(
      'statechange',
      expect.any(Function)
    );
    const stateHandler = worker.addEventListener.mock.calls[0][1];
    worker.state = 'installed';
    stateHandler();

    expect(toast.info).toHaveBeenCalled();
    unsubscribe();
  });

  it('does not notify on the first install (no active controller)', async () => {
    const worker = {
      addEventListener: vi.fn<MockListenerFn>(),
      state: 'installing'
    };
    const registration = {
      installing: worker,
      waiting: null,
      addEventListener: vi.fn<MockListenerFn>()
    };
    stubServiceWorker({
      ready: Promise.resolve(registration),
      controller: null,
      addEventListener: vi.fn()
    });

    const unsubscribe = setupSwUpdateDetection();

    await vi.waitFor(() => {
      expect(registration.addEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      );
    });
    const updateFoundHandler = registration.addEventListener.mock.calls[0][1];
    updateFoundHandler();

    const stateHandler = worker.addEventListener.mock.calls[0][1];
    worker.state = 'installed';
    stateHandler();

    expect(toast.info).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('returns a no-op unsubscribe when service workers are unsupported', () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');

    const unsubscribe = setupSwUpdateDetection();

    expect(typeof unsubscribe).toBe('function');
  });
});

describe('applySwUpdate', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    });
  });

  it('posts SKIP_WAITING and reloads when the new worker takes control', () => {
    const postMessage = vi.fn();
    const controllerHandlers: Array<() => void> = [];
    stubServiceWorker({
      addEventListener: vi.fn((_type: string, fn: () => void) => {
        controllerHandlers.push(fn);
      })
    });
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload }
    });

    applySwUpdate({
      waiting: { postMessage }
    } as unknown as ServiceWorkerRegistration);

    expect(postMessage).toHaveBeenCalledWith({ type: SKIP_WAITING_MESSAGE });
    expect(reload).not.toHaveBeenCalled();
    controllerHandlers.forEach(fn => fn());
    expect(reload).toHaveBeenCalled();
  });

  it('reloads immediately when no worker is waiting', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload }
    });
    stubServiceWorker({ addEventListener: vi.fn() });

    applySwUpdate({ waiting: null } as unknown as ServiceWorkerRegistration);

    expect(reload).toHaveBeenCalled();
  });
});
