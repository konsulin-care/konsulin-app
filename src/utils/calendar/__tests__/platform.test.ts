import { describe, expect, it } from 'vitest';
import { detectCalendarPlatform } from '../platform';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const IPHONE_CRIOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.109 Mobile/15E148 Safari/604.1';
const IPHONE_FXIOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/119.0 Mobile/15E148 Safari/605.1.15';
const IPHONE_INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 286.0.0.0.72 (iPhone13,2; iOS 16_6; en_US; en-US; scale=3.00; 1170x2532; 476441946)';
const IPHONE_FBAN =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/430.0.0.29.106]';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('detectCalendarPlatform', () => {
  it('returns ios-safari for iPhone Safari', () => {
    expect(detectCalendarPlatform(IPHONE_SAFARI, 5)).toBe('ios-safari');
  });

  it('returns ios-safari for iPadOS Safari reporting MacIntel with maxTouchPoints > 1', () => {
    expect(detectCalendarPlatform(IPAD_DESKTOP_SAFARI, 5)).toBe('ios-safari');
    expect(detectCalendarPlatform('MacIntel', 3)).toBe('ios-safari');
  });

  it('returns other for desktop Mac Safari with maxTouchPoints 0', () => {
    expect(detectCalendarPlatform(MAC_SAFARI, 0)).toBe('other');
  });

  it('returns other for CriOS, FxiOS, Instagram and FBAN user agents on iOS', () => {
    expect(detectCalendarPlatform(IPHONE_CRIOS, 5)).toBe('other');
    expect(detectCalendarPlatform(IPHONE_FXIOS, 5)).toBe('other');
    expect(detectCalendarPlatform(IPHONE_INSTAGRAM, 5)).toBe('other');
    expect(detectCalendarPlatform(IPHONE_FBAN, 5)).toBe('other');
  });

  it('returns other for Android Chrome and desktop Chrome', () => {
    expect(detectCalendarPlatform(ANDROID_CHROME, 5)).toBe('other');
    expect(detectCalendarPlatform(MAC_CHROME, 0)).toBe('other');
    expect(detectCalendarPlatform(MAC_CHROME, 5)).toBe('other');
  });
});
