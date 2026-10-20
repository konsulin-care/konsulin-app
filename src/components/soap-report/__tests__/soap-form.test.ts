import enToast from '@/messages/en/toast.json';
import idToast from '@/messages/id/toast.json';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Questionnaire } from 'fhir/r4';
import { createElement, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { describe, expect, it, type Mock, vi } from 'vitest';
import SoapForm, { buildSoapResponseResource } from '../soap-form';

const h = vi.hoisted(() => ({
  locale: 'id' as 'en' | 'id',
  submitSoapBundle: vi.fn()
}));

vi.mock('@/i18n', async () => {
  const en = (await import('@/messages/en/toast.json')).default;
  const id = (await import('@/messages/id/toast.json')).default;
  const messages: Record<string, Record<string, Record<string, string>>> = {
    en: { toast: en as Record<string, string> },
    id: { toast: id as Record<string, string> }
  };
  return {
    useTranslations: (namespace: string) => (key: string) => {
      const message = messages[h.locale]?.[namespace]?.[key];
      if (message === undefined) {
        throw new Error(`Missing message: ${h.locale}/${namespace}/${key}`);
      }
      return message;
    }
  };
});

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/assessments/soap',
  useSearchParams: () => null
}));

vi.mock('@aehrc/smart-forms-renderer', () => ({
  buildForm: vi.fn(),
  destroyForm: vi.fn(),
  extractObservationBased: vi.fn().mockReturnValue([]),
  getResponse: vi.fn().mockReturnValue({
    id: 'soap-response-1',
    resourceType: 'QuestionnaireResponse',
    status: 'in-progress',
    item: []
  }),
  RendererThemeProvider: ({ children }: { children?: ReactNode }) =>
    children ?? null
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { soapDrafts: 'soapDrafts' },
  dbGet: vi.fn().mockResolvedValue(null),
  dbDelete: vi.fn()
}));

vi.mock('@/services/api/assessment', () => ({
  useSubmitSoapBundle: () => ({
    mutateAsync: h.submitSoapBundle,
    isPending: false
  })
}));

vi.mock('@/hooks/useRequiredValidation', () => ({
  useRequiredValidation: () => ({
    requiredItemEmpty: 0,
    checkRequiredIsEmpty: vi.fn(),
    invalidItems: {}
  })
}));

vi.mock('@/hooks/useDraftAutoSave', () => ({
  useDraftAutoSave: () => vi.fn()
}));

vi.mock('@/components/general/page-loader', () => ({
  default: () => null
}));

vi.mock('@/components/general/smart-form-shell', () => ({
  SmartFormShell: () => null
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => null
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => createElement('button', { onClick, disabled }, children)
}));

describe('buildSoapResponseResource', () => {
  it('sets the canonical soap questionnaire url on the response', () => {
    const qr = buildSoapResponseResource(
      {
        id: 'soap-1',
        resourceType: 'QuestionnaireResponse',
        status: 'in-progress',
        item: [{ linkId: 'subjective' }]
      },
      { reference: 'Practitioner/dr-1' },
      { reference: 'Patient/pat-1' },
      '2026-01-01T00:00:00Z'
    );

    expect(qr.questionnaire).toBe(
      'https://konsulin.care/fhir/Questionnaire/soap'
    );
    expect(qr.status).toBe('completed');
    expect(qr.authored).toBe('2026-01-01T00:00:00Z');
    expect(qr.author).toEqual({ reference: 'Practitioner/dr-1' });
    expect(qr.subject).toEqual({ reference: 'Patient/pat-1' });
  });
});

describe('SOAP submission failure toast', () => {
  it.each(['id', 'en'] as const)(
    'shows only the %s message for a failed submission',
    async locale => {
      h.locale = locale;
      (toast.error as Mock).mockClear();
      h.submitSoapBundle.mockReset();
      h.submitSoapBundle.mockRejectedValueOnce(new Error('server error'));

      render(
        createElement(SoapForm, {
          questionnaire: { resourceType: 'Questionnaire' } as Questionnaire,
          patientId: 'pat-1',
          practitionerId: 'prac-1',
          mode: 'create'
        })
      );

      const saveButton = await screen.findByRole('button', {
        name: 'Save SOAP'
      });
      await waitFor(() => expect(saveButton).toBeEnabled());
      fireEvent.click(saveButton);

      await waitFor(() => expect(h.submitSoapBundle).toHaveBeenCalled());
      await waitFor(() => expect(toast.error).toHaveBeenCalled());

      const expected = (locale === 'id' ? idToast : enToast).soap_submit_error;
      const otherLocaleMessage = (locale === 'id' ? enToast : idToast)
        .soap_submit_error;

      // Exactly one error toast, resolved from the active locale's messages.
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(expected);

      // No mixed-language toast for the same failure.
      const emitted = (toast.error as Mock).mock.calls.map(call =>
        String(call[0])
      );
      expect(emitted).not.toContain(otherLocaleMessage);
    }
  );
});
