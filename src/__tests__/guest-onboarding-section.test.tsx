import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GuestOnboardingSection from '../components/general/home/guest-onboarding-section';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GuestOnboardingSection', () => {
  it('renders three feature cards', () => {
    render(<GuestOnboardingSection />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
  });

  it('has no duplicate React keys (no console error)', () => {
    // deepsource:ignore JS-0321 — intentional: suppress console noise in test
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<GuestOnboardingSection />);

    const duplicateKeyWarning = errorSpy.mock.calls.find(([msg]) =>
      String(msg).includes('same key')
    );
    expect(duplicateKeyWarning).toBeUndefined();
  });

  it('links Mental Health Checkups to /assessments', () => {
    render(<GuestOnboardingSection />);

    expect(
      screen.getByRole('link', { name: /mental health checkups/i })
    ).toHaveAttribute('href', '/assessments');
  });

  it('links Personal Journal to /auth?redirectToPath=/journal', () => {
    render(<GuestOnboardingSection />);

    expect(
      screen.getByRole('link', { name: /personal journal/i })
    ).toHaveAttribute('href', '/auth?redirectToPath=/journal');
  });

  it('links Expert Sessions to /recommendation', () => {
    render(<GuestOnboardingSection />);

    expect(
      screen.getByRole('link', { name: /expert sessions/i })
    ).toHaveAttribute('href', '/recommendation');
  });
});
