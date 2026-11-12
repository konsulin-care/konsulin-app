/** Platform detected for the add-to-calendar flow. */
export type CalendarPlatform = 'ios-safari' | 'other';

const IOS_DEVICE = /iPhone|iPad|iPod/;
const MAC_PLATFORM = /MacIntel|Macintosh|Mac OS X/;
const OTHER_BROWSER =
  /CriOS|FxiOS|EdgiOS|OPiOS|Chrome\/|Firefox\/|SamsungBrowser|FBAV|FBAN|FBAI|Instagram|Twitter|Snapchat|TikTok|LinkedInApp|Headless|; wv/;

/**
 * Detects whether the client is iOS Safari (including iPadOS desktop-mode
 * Safari, which reports MacIntel with several touch points) or anything else.
 *
 * @param ua - User agent string (or platform string such as MacIntel)
 * @param maxTouchPoints - navigator.maxTouchPoints value
 * @returns 'ios-safari' or 'other'
 */
export function detectCalendarPlatform(
  ua: string,
  maxTouchPoints: number
): CalendarPlatform {
  const isIosDevice =
    IOS_DEVICE.test(ua) || (MAC_PLATFORM.test(ua) && maxTouchPoints > 1);
  // Other-browser tokens veto the Safari token: CriOS/FxiOS/Instagram UAs
  // also embed "Safari", so a positive Safari check alone is not enough.
  const isSafari = !OTHER_BROWSER.test(ua);
  if (isIosDevice && isSafari) {
    return 'ios-safari';
  }
  return 'other';
}
