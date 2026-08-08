import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeaderCarousel from '../header-carousel';

/** jsdom lacks ResizeObserver; capture callbacks so tests can trigger re-measures. */
class ResizeObserverMock {
  static readonly instances: ResizeObserverMock[] = [];
  callback: ResizeObserverCallback;
  observed = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }
}

/** Give swiper a real container width so its geometry is computable in jsdom. */
function mockSlideClientWidth(width: number) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return width;
    }
  });
}

/** Mock matchMedia with the given reduced-motion preference. */
function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

/** Flushes pending microtasks so MutationObserver callbacks and effects settle. */
const flush = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

function getActiveSlideText(): string {
  return document.querySelector('.swiper-slide-active')?.textContent ?? '';
}

function getSwiperInstance(): {
  autoplay: { running: boolean };
  params: {
    autoplay: {
      delay: number;
      disableOnInteraction: boolean;
      pauseOnMouseEnter: boolean;
    };
  };
} {
  const element = document.querySelector('.swiper') as unknown as {
    swiper?: {
      autoplay: { running: boolean };
      params: {
        autoplay: {
          delay: number;
          disableOnInteraction: boolean;
          pauseOnMouseEnter: boolean;
        };
      };
    };
  };
  if (!element.swiper) throw new Error('swiper instance not attached');
  return element.swiper;
}

beforeEach(() => {
  ResizeObserverMock.instances.length = 0;
  globalThis.ResizeObserver = ResizeObserverMock;
  mockMatchMedia(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('HeaderCarousel render behavior', () => {
  it('renders nothing when both card props are absent', () => {
    const { container } = render(<HeaderCarousel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single card statically without a swiper', () => {
    render(<HeaderCarousel session={<div>Session card</div>} />);

    expect(screen.getByText('Session card')).toBeTruthy();
    expect(document.querySelector('.swiper')).toBeNull();
  });

  it('renders both cards as swiper slides when both are present', () => {
    render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    const realSlides = document.querySelectorAll(
      '.swiper-slide:not(.swiper-slide-duplicate)'
    );
    expect(realSlides.length).toBe(2);
    expect(screen.getByText('Session card')).toBeTruthy();
    expect(screen.getByText('Research card')).toBeTruthy();
  });

  it('excludes a self-hiding research card and keeps the session card static', async () => {
    const NullCard = () => null;
    const { rerender } = render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<NullCard />}
      />
    );

    expect(document.querySelector('.swiper')).toBeNull();
    expect(screen.getByText('Session card')).toBeTruthy();

    // research data arrives: the wrapper gains content, the MutationObserver promotes
    rerender(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    await waitFor(() => {
      expect(document.querySelector('.swiper')).toBeTruthy();
    });
    expect(screen.getByText('Research card')).toBeTruthy();
  });

  it('hides the non-present card so only one card is visible', () => {
    const NullCard = () => null;
    const { container } = render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<NullCard />}
      />
    );

    const wrappers = [
      ...container.querySelectorAll('[data-testid="header-carousel"] > div')
    ];
    expect(wrappers.length).toBe(2);
    expect(wrappers.filter(w => w.className.includes('h-full')).length).toBe(1);
    expect(wrappers.filter(w => w.className.includes('hidden')).length).toBe(1);
  });

  it('promotes to a carousel when the research card appears without a resize event', async () => {
    const NullCard = () => null;
    const { rerender } = render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<NullCard />}
      />
    );
    expect(document.querySelector('.swiper')).toBeNull();

    rerender(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    await waitFor(() => {
      expect(document.querySelector('.swiper')).toBeTruthy();
    });
  });

  it('keeps wrappers mounted when both cards are empty at mount and promotes once content arrives', async () => {
    const NullCard = () => null;
    const { container, rerender } = render(
      <HeaderCarousel session={<NullCard />} research={<NullCard />} />
    );

    const wrappers = [
      ...container.querySelectorAll('[data-testid="header-carousel"] > div')
    ];
    expect(wrappers.length).toBe(2);
    expect(wrappers.filter(w => w.className.includes('hidden')).length).toBe(2);
    expect(document.querySelector('.swiper')).toBeNull();

    rerender(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    await waitFor(() => {
      expect(document.querySelector('.swiper')).toBeTruthy();
    });
    expect(screen.getByText('Session card')).toBeTruthy();
    expect(screen.getByText('Research card')).toBeTruthy();
  });

  it('attaches the header-carousel testid to the swiper container', () => {
    render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    const carousel = document.querySelector('[data-testid="header-carousel"]');
    expect(carousel).not.toBeNull();
    expect(carousel?.className).toContain('swiper');
  });
});

describe('HeaderCarousel autoplay', () => {
  it('configures a 5-second delay that keeps running after interaction and pauses on hover', () => {
    render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    const { params } = getSwiperInstance();
    expect(params.autoplay.delay).toBe(5000);
    expect(params.autoplay.disableOnInteraction).toBe(false);
    expect(params.autoplay.pauseOnMouseEnter).toBe(true);
  });

  it('advances to the other card after 5 seconds and loops back', () => {
    vi.useFakeTimers();
    // jsdom cannot lay out slides; a real container width makes swiper's
    // geometry (and therefore isEnd/rewind) computable.
    mockSlideClientWidth(400);
    render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    expect(getActiveSlideText()).toContain('Session card');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(getActiveSlideText()).toContain('Research card');

    // jsdom never fires transitionend; resume the autoplay timer manually
    const wrapper = document.querySelector('.swiper-wrapper');
    expect(wrapper).not.toBeNull();
    fireEvent.transitionEnd(wrapper);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(getActiveSlideText()).toContain('Session card');
  });

  it('does not autoplay when the user prefers reduced motion', () => {
    vi.useFakeTimers();
    mockMatchMedia(true);
    render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    expect(getSwiperInstance().autoplay.running).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(getActiveSlideText()).toContain('Session card');
  });
});

describe('HeaderCarousel equal height', () => {
  it('stretches slides via flex instead of setting an inline container height', () => {
    render(
      <HeaderCarousel
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    const swiperElement = document.querySelector<HTMLElement>('.swiper');
    if (!swiperElement) {
      throw new Error('swiper element not found');
    }
    expect(swiperElement.className).toContain('header-carousel');
    expect(swiperElement.style.height).toBe('');

    document
      .querySelectorAll('.swiper-slide > div')
      .forEach(wrapper => expect(wrapper.className).toContain('h-full'));
  });
});

describe('HeaderCarousel observer safety', () => {
  it('creates no ResizeObserver and does not re-render when presence is unchanged', async () => {
    const renderCount: number[] = [];
    const ProbeCard = () => {
      renderCount.push(1);
      return <div>Probe</div>;
    };
    render(<HeaderCarousel session={<ProbeCard />} research={<ProbeCard />} />);

    await waitFor(() => expect(document.querySelector('.swiper')).toBeTruthy());
    // Let swiper init settle (active-class application re-renders slides once).
    await flush();
    // HeaderCarousel itself must not observe the card wrappers; Swiper's own
    // container observer is bounded and unrelated to the height feedback loop.
    const wrapperObservers = ResizeObserverMock.instances.filter(instance =>
      [...instance.observed].some(target => target.className.includes('h-full'))
    );
    expect(wrapperObservers.length).toBe(0);

    const settled = renderCount.length;
    // A real MutationObserver event with unchanged presence must not re-render.
    const wrapper = document.querySelector<HTMLElement>('.swiper-slide > div');
    const firstChild = wrapper?.firstChild;
    if (firstChild) {
      act(() => {
        wrapper?.replaceChild(document.createElement('div'), firstChild);
      });
    }
    await flush();
    expect(renderCount.length).toBe(settled);
  });
});
