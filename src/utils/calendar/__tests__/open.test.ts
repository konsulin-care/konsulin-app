import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addToCalendar } from '../open';
import type { CalendarEvent } from '../types';

const event: CalendarEvent = {
  uid: 'appt-1@konsulin.test',
  title: 'Consultation',
  description: 'Initial consult',
  startDate: '2025-03-15'
};

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const OBJECT_URL = 'blob:calendar-test';

function setNavigator(userAgent: string, maxTouchPoints: number): void {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
    writable: true
  });
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
    writable: true
  });
}

describe('addToCalendar', () => {
  let assignMock: ReturnType<typeof vi.fn<(url: string) => void>>;
  let openSpy: ReturnType<typeof vi.spyOn>;
  let originalLocation: Window['location'];
  let createObjectURLMock: ReturnType<typeof vi.fn<(blob: Blob) => string>>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom marks Location#assign unforgeable (configurable: false), so the
    // location object itself is replaced — the repo-wide pattern for this.
    originalLocation = window.location;
    assignMock = vi.fn<(url: string) => void>();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: assignMock }
    });
    openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    createObjectURLMock = vi.fn((_blob: Blob) => OBJECT_URL);
    revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURLMock,
      configurable: true,
      writable: true
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURLMock,
      configurable: true,
      writable: true
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    });
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('on ios-safari creates a text/calendar Blob URL and assigns it without window.open', () => {
    setNavigator(IPHONE_SAFARI, 5);
    addToCalendar(event);
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob = createObjectURLMock.mock.calls[0][0];
    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(assignMock).toHaveBeenCalledWith(OBJECT_URL);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('on ios-safari revokes the object URL after the timeout', () => {
    setNavigator(IPHONE_SAFARI, 5);
    addToCalendar(event);
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(revokeObjectURLMock).toHaveBeenCalledWith(OBJECT_URL);
  });

  it('on other platforms opens the Google Calendar URL with _blank and noopener', () => {
    setNavigator(ANDROID_CHROME, 5);
    addToCalendar(event);
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://calendar.google.com/calendar/render?action=TEMPLATE'
      ),
      '_blank',
      'noopener'
    );
    expect(assignMock).not.toHaveBeenCalled();
    expect(createObjectURLMock).not.toHaveBeenCalled();
  });
});
