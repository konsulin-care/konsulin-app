import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patientPills, practitionerPills, researcherPills } from '../pills';
import type { Pill } from '../types';
import { usePillActions } from '../use-pill-actions';

const authState: { roleName: string | undefined } = { roleName: 'Patient' };
const mockPush = vi.fn();
const mockSetResult = vi.fn();

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: authState.roleName
        ? { role_name: authState.roleName }
        : undefined
    }
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

vi.mock('@/context/recommendationContext', () => ({
  useRecommendationResult: () => ({ result: null, setResult: mockSetResult })
}));

vi.mock('../../register-practitioner-drawer', () => ({
  default: () => null
}));
vi.mock('../../add-location-drawer', () => ({ default: () => null }));
vi.mock('../../add-assessment-drawer', () => ({ default: () => null }));
vi.mock('../../screening-drawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid='screening-drawer' /> : null
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

/** Wraps the hook with the query client it needs. */
function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Boots the hook inside the required providers. */
function setup() {
  return renderHook(() => usePillActions(), { wrapper: Wrapper });
}

/** Reads the redirect intent cookie value, if any. */
function readRedirectIntent(): string | undefined {
  return document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('redirect_intent='))
    ?.replace('redirect_intent=', '');
}

describe('usePillActions', () => {
  beforeEach(() => {
    authState.roleName = 'Patient';
    mockPush.mockReset();
    mockSetResult.mockReset();
    document.cookie = 'redirect_intent=; Max-Age=0; Path=/';
  });

  it('returns practitionerPills for the Practitioner role', () => {
    authState.roleName = 'Practitioner';
    const { result } = setup();
    expect(result.current.pills.map(pill => pill.label)).toEqual(
      practitionerPills.map(pill => pill.label)
    );
  });

  it('keeps researcherPills unchanged for the Researcher role', () => {
    authState.roleName = 'Researcher';
    const { result } = setup();
    expect(result.current.pills.map(pill => pill.label)).toEqual(
      researcherPills.map(pill => pill.label)
    );
    expect(result.current.pills.some(pill => pill.href === '/studies')).toBe(
      false
    );
  });

  it('includes a Browse studies pill linking to /studies for patients', () => {
    const { result } = setup();
    expect(result.current.pills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'pill_browse_studies',
          href: '/studies'
        })
      ])
    );
  });

  it('includes a Browse studies pill linking to /studies for guests', () => {
    authState.roleName = 'Guest';
    const { result } = setup();
    expect(result.current.pills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'pill_browse_studies',
          href: '/studies'
        })
      ])
    );
  });

  it('navigates a guest to /studies from Browse studies without an auth redirect', () => {
    authState.roleName = 'Guest';
    const { result } = setup();
    const studiesPill = patientPills.find(pill => pill.href === '/studies');
    expect(studiesPill).toBeDefined();

    act(() => {
      if (studiesPill) result.current.onPillClick(studiesPill);
    });

    expect(readRedirectIntent()).toBeUndefined();
    expect(mockPush).toHaveBeenCalledWith('/studies');
    expect(mockPush).not.toHaveBeenCalledWith('/auth');
  });

  it('returns patientPills for the Guest role', () => {
    authState.roleName = 'Guest';
    const { result } = setup();
    expect(result.current.pills.map(pill => pill.label)).toEqual(
      patientPills.map(pill => pill.label)
    );
  });

  it('returns patientPills for an unknown role', () => {
    authState.roleName = 'SomethingElse';
    const { result } = setup();
    expect(result.current.pills.map(pill => pill.label)).toEqual(
      patientPills.map(pill => pill.label)
    );
  });

  it('redirects a guest with a non-assessment pill to /auth via intent cookie', () => {
    authState.roleName = 'Guest';
    const { result } = setup();
    const journalPill = patientPills.find(pill => pill.href === '/journal');
    expect(journalPill).toBeDefined();

    act(() => {
      if (journalPill) result.current.onPillClick(journalPill);
    });

    expect(readRedirectIntent()).toBe('%2Fjournal');
    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  it('pushes the assessments href directly for a guest', () => {
    authState.roleName = 'Guest';
    const { result } = setup();
    const assessmentPill = patientPills.find(
      pill => pill.href === '/assessments'
    );
    expect(assessmentPill).toBeDefined();

    act(() => {
      if (assessmentPill) result.current.onPillClick(assessmentPill);
    });

    expect(readRedirectIntent()).toBeUndefined();
    expect(mockPush).toHaveBeenCalledWith('/assessments');
  });

  it('opens the screening drawer from the get-recommendation pill', () => {
    const { result } = setup();
    const recommendationPill: Pill = {
      label: 'pill_get_recommendation',
      icon: Sparkles,
      delay: 0,
      action: 'get-recommendation'
    };

    act(() => {
      result.current.onPillClick(recommendationPill);
    });

    const { getByTestId } = render(<>{result.current.drawers}</>);
    expect(getByTestId('screening-drawer')).toBeInTheDocument();
  });
});
