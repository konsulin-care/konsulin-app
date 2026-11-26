import { wrapper } from '@/__tests__/react-test-utils';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import EditResearchForm from '../edit/research-form';
import ResearchForm from '../register/research-form';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: () => ({ data: [] }) };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/research/register',
  useSearchParams: () => new URLSearchParams('page=title')
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'practitioner-1',
        organizationId: 'organization-1',
        fullname: 'Dr. Sari'
      }
    }
  })
}));

vi.mock('@/services/api/organization', () => ({
  useOrganizationName: () => ({ data: 'Klinik Sehat Jiwa' })
}));

vi.mock('@/components/shared/questionnaire-upload-drawer', () => ({
  default: () => null
}));

vi.mock('../research-form-fab-bridge', () => ({
  ResearchFormFabBridge: () => null
}));

const STUDY: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'study-1',
  title: 'Sleep and mood',
  status: 'active'
};

const PLAN: PlanDefinition = {
  resourceType: 'PlanDefinition',
  id: 'plan-1',
  status: 'active',
  effectivePeriod: { start: '2026-01-01', end: '2026-01-31' },
  action: [{ definitionCanonical: 'Questionnaire/phq2' }]
};

describe('research form preview wiring', () => {
  it('renders the preview with the live title on the register form', () => {
    render(<ResearchForm />, { wrapper });

    expect(
      screen.getByRole('heading', { name: 'What people will see' })
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Your study title' })
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Sleep and mood' }
    });

    expect(
      screen.getByRole('heading', { name: 'Sleep and mood' })
    ).toBeTruthy();
  });

  it('renders the preview on the edit form', () => {
    render(<EditResearchForm study={STUDY} planDefinitions={[PLAN]} />, {
      wrapper
    });

    expect(
      screen.getByRole('heading', { name: 'What people will see' })
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Sleep and mood' })
    ).toBeTruthy();
  });
});
