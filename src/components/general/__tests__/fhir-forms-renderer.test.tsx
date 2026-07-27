/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, react/jsx-no-useless-fragment, @next/next/no-img-element, jsx-a11y/alt-text */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  })
}));

vi.mock('@/components/general/card-dom-mapper', () => ({
  CardDomMapper: () => null
}));

vi.mock('@/hooks/useQuestionFocus', () => ({
  useQuestionFocus: () => ({
    activeCardIndex: 0,
    setActiveCardIndex: vi.fn(),
    totalFocusable: 1,
    totalAnswerable: 1,
    cardStates: { q1: 'active' },
    displayItemLinkIds: [],
    focusableLinkIds: ['q1'],
    isRequired: vi.fn().mockReturnValue(true),
    isAnswered: vi.fn().mockReturnValue(false)
  })
}));

vi.mock('@/hooks/useCardSwipe', () => ({
  useCardSwipe: () => ({
    swipeDirection: null,
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn()
  })
}));

vi.mock('@aehrc/smart-forms-renderer', () => ({
  getResponse: vi.fn(),
  RendererThemeProvider: ({ children }: any) => <>{children}</>,
  rendererThemeOptions: {},
  rendererThemeComponentOverrides: vi.fn(() => ({})),
  useBuildForm: vi.fn().mockReturnValue(false)
}));

vi.mock('@/services/api/assessment', () => ({
  useSubmitQuestionnaire: vi.fn()
}));

vi.mock('@/hooks/useDraftAutoSave', () => ({
  useDraftAutoSave: vi.fn().mockReturnValue(vi.fn())
}));

vi.mock('@/hooks/useRequiredValidation', () => ({
  useRequiredValidation: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: {
    assessmentDrafts: 'assessment_drafts',
    serviceRequests: 'service_requests'
  },
  dbGet: vi.fn().mockResolvedValue(null),
  dbSet: vi.fn(),
  dbDelete: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/components/general/smart-form-shell', () => ({
  SmartFormShell: ({ className }: any) => (
    <div data-testid='mock-smart-form' className={className}>
      Smart Form
    </div>
  )
}));

vi.mock('@/components/general/page-loader', () => ({
  default: () => <div data-testid='mock-page-loader'>Loading...</div>
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: (props: any) => (
    <svg data-testid='mock-loading-spinner' {...props} />
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button data-testid='mock-button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: any) =>
    open ? <div data-testid='mock-drawer'>{children}</div> : null,
  DrawerContent: ({ children }: any) => (
    <div data-testid='mock-drawer-content'>{children}</div>
  ),
  DrawerDescription: ({ children }: any) => (
    <div data-testid='mock-drawer-description'>{children}</div>
  ),
  DrawerFooter: ({ children }: any) => (
    <div data-testid='mock-drawer-footer'>{children}</div>
  ),
  DrawerHeader: ({ children }: any) => (
    <div data-testid='mock-drawer-header'>{children}</div>
  ),
  DrawerTitle: ({ children }: any) => (
    <div data-testid='mock-drawer-title'>{children}</div>
  )
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() }
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img data-testid='mock-image' {...props} />
}));

vi.mock('@/constants/roles', () => ({
  Roles: {
    Patient: 'Patient',
    Practitioner: 'Practitioner',
    ClinicAdmin: 'ClinicAdmin'
  }
}));

import { useRequiredValidation } from '@/hooks/useRequiredValidation';
import { useSubmitQuestionnaire } from '@/services/api/assessment';
import { getResponse, useBuildForm } from '@aehrc/smart-forms-renderer';
import type { Questionnaire } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import FhirFormsRenderer from '../fhir-forms-renderer';

const mockQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  id: 'q-123',
  title: 'PHQ-9',
  status: 'active',
  item: [{ linkId: 'q1', text: 'Question 1', type: 'string' }]
};

describe('FhirFormsRenderer - loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn()
    } as any);
    vi.mocked(useSubmitQuestionnaire).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'resp-789' }),
      isLoading: false
    } as any);
    vi.mocked(useRequiredValidation).mockReturnValue({
      requiredItemEmpty: 0,
      checkRequiredIsEmpty: vi.fn(),
      invalidItems: {}
    } as any);
  });

  it('shows PageLoader while useBuildForm returns true', () => {
    vi.mocked(useBuildForm).mockReturnValue(true);

    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    expect(screen.getByTestId('mock-page-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-smart-form')).not.toBeInTheDocument();
  });

  it('renders SmartFormShell when useBuildForm returns false', () => {
    vi.mocked(useBuildForm).mockReturnValue(false);

    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    expect(screen.getByTestId('mock-smart-form')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-page-loader')).not.toBeInTheDocument();
  });

  it('passes rendererConfigOptions with full-width stacked layout', () => {
    vi.mocked(useBuildForm).mockReturnValue(false);

    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    const lastCallOptions = vi.mocked(useBuildForm).mock.calls[0][0];
    const config = lastCallOptions.rendererConfigOptions;

    expect(config.itemResponsive?.labelBreakpoints).toEqual({
      xs: 12,
      md: 12
    });
    expect(config.itemResponsive?.fieldBreakpoints).toEqual({
      xs: 12,
      md: 12
    });
  });

  it('renders CardStackContainer wrapping the form', () => {
    vi.mocked(useBuildForm).mockReturnValue(false);

    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    // CardStackContainer renders card-stack-viewport
    const viewport = document.querySelector('.card-stack-viewport');
    expect(viewport).toBeInTheDocument();
    // Form should be inside the viewport
    expect(
      viewport?.querySelector('[data-testid="mock-smart-form"]')
    ).not.toBeNull();
  });
});

describe('FhirFormsRenderer - navigation (router.replace vs push)', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  let mockSubmitQuestionnaire: any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: vi.fn()
    } as any);

    mockSubmitQuestionnaire = vi.fn().mockResolvedValue({ id: 'resp-789' });
    vi.mocked(useSubmitQuestionnaire).mockReturnValue({
      mutateAsync: mockSubmitQuestionnaire,
      isLoading: false
    } as any);

    vi.mocked(useRequiredValidation).mockReturnValue({
      requiredItemEmpty: 0,
      checkRequiredIsEmpty: vi.fn(),
      invalidItems: {}
    } as any);

    vi.mocked(getResponse).mockReturnValue({
      resourceType: 'QuestionnaireResponse',
      questionnaire: 'Questionnaire/q-123',
      status: 'completed',
      item: [{ linkId: 'q1', text: 'Answer 1' }]
    } as any);
  });

  it('calls router.replace (not router.push) when navigating to results after submission', async () => {
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    // Click "Kirim" button to open the drawer
    const kirimButton = screen
      .getAllByTestId('mock-button')
      .find(btn => btn.textContent === 'Kirim');
    expect(kirimButton).toBeDefined();

    fireEvent.click(kirimButton);

    // Drawer should open with "See result" button
    await waitFor(() => {
      expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
    });

    const seeResultButton = screen
      .getAllByTestId('mock-button')
      .find(btn => btn.textContent === 'See result');
    expect(seeResultButton).toBeDefined();

    // Click "See result" — triggers submission then navigation
    fireEvent.click(seeResultButton);

    // Verify the submission was called
    await waitFor(() => {
      expect(mockSubmitQuestionnaire).toHaveBeenCalled();
    });

    // Verify router.replace was called (not router.push)
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    // Verify the URL includes the record ID and category
    const replaceUrl = mockReplace.mock.calls[0][0] as string;
    expect(replaceUrl).toContain('id=resp-789');
    expect(replaceUrl).toContain('category=1');
    expect(replaceUrl).toContain('title=PHQ-9');
  });

  it('still calls router.push for the "close" action', async () => {
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );

    // Click "Kirim" to open drawer
    const kirimButton = screen
      .getAllByTestId('mock-button')
      .find(btn => btn.textContent === 'Kirim');
    fireEvent.click(kirimButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
    });

    // Click "Close" button
    const closeButton = screen
      .getAllByTestId('mock-button')
      .find(btn => btn.textContent === 'Close');
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);

    // "Close" should still use router.push to /assessments
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/assessments');
    });
  });
});
