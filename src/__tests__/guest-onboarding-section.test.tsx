import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      start_wellness: 'Start Your Wellness Journey',
      mental_health: 'Mental Health Checkups',
      mental_health_desc:
        'Take quick, private assessments to understand your well-being',
      journal: 'Personal Journal',
      journal_desc: 'Track your thoughts and progress over time',
      sessions: 'Expert Sessions',
      sessions_desc: 'Book appointments with licensed professionals'
    };
    return translations[key] ?? key;
  })
}));

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
    // skipcq: JS-0321 — intentional: suppress console noise in test
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
