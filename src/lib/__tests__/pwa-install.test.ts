import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type InstallModule = typeof import('@/lib/pwa-install');

describe('pwa-install', () => {
  let mod: InstallModule;
  let unsubscribe: (() => void) | undefined;

  beforeEach(async () => {
    vi.resetModules();
    mod = await import('@/lib/pwa-install');
  });

  afterEach(() => {
    unsubscribe?.();
    vi.restoreAllMocks();
  });

  it('captures beforeinstallprompt and prevents default', () => {
    unsubscribe = mod.setupInstallPrompt();

    const event = new Event('beforeinstallprompt');
    const preventDefault = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(mod.canInstall()).toBe(true);
  });

  it('prompts the user via installPwa and clears the stash', async () => {
    const prompt = vi.fn<() => Promise<void>>().mockResolvedValue();
    unsubscribe = mod.setupInstallPrompt();

    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'prompt', { value: prompt });
    window.dispatchEvent(event);

    await mod.installPwa();

    expect(prompt).toHaveBeenCalled();
    expect(mod.canInstall()).toBe(false);
  });

  it('no-ops installPwa when no prompt is captured', async () => {
    unsubscribe = mod.setupInstallPrompt();

    await expect(mod.installPwa()).resolves.toBeUndefined();
  });

  it('clears installability after appinstalled', () => {
    unsubscribe = mod.setupInstallPrompt();

    window.dispatchEvent(new Event('beforeinstallprompt'));
    expect(mod.canInstall()).toBe(true);

    window.dispatchEvent(new Event('appinstalled'));
    expect(mod.canInstall()).toBe(false);
  });

  it('removes listeners on unsubscribe', () => {
    unsubscribe = mod.setupInstallPrompt();
    unsubscribe();
    unsubscribe = undefined;

    window.dispatchEvent(new Event('beforeinstallprompt'));

    expect(mod.canInstall()).toBe(false);
  });
});
