/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, react/jsx-no-useless-fragment, @next/next/no-img-element, jsx-a11y/alt-text, max-lines */

import { FabProvider, useFab } from '@/context/fabContext';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi
    .fn()
    .mockReturnValue({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })
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
  dbSet: vi.fn().mockReturnValue(Promise.resolve()),
  dbDelete: vi.fn()
}));
vi.mock('@/services/api', () => ({ getAPI: vi.fn() }));
vi.mock('@/components/general/smart-form-shell', () => ({
  SmartFormShell: ({ className, onChange }: any) => (
    <div data-testid='mock-smart-form' className={className}>
      <input data-testid='mock-form-input' onChange={onChange} />
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
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
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
import { useBuildForm } from '@aehrc/smart-forms-renderer';
import type { Questionnaire } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import FhirFormsRenderer from '../fhir-forms-renderer';

const mockQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  id: 'q-123',
  title: 'PHQ-9',
  status: 'active',
  item: [{ linkId: 'q1', text: 'Question 1', type: 'string' }]
};

function DirtyStateObserver({
  onDirtyState
}: {
  onDirtyState: (state: unknown) => void;
}) {
  const { state } = useFab();
  useEffect(() => {
    onDirtyState(state.action);
  }, [state.action, onDirtyState]);
  return null;
}

function setupBeforeEach() {
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
  });
  vi.mocked(useBuildForm).mockReturnValue(false);
}

describe('FhirFormsRenderer - loading state', () => {
  beforeEach(setupBeforeEach);

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
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );
    const cfg = vi.mocked(useBuildForm).mock.calls[0][0].rendererConfigOptions;
    expect(cfg?.itemResponsive?.labelBreakpoints).toEqual({ xs: 12, md: 12 });
    expect(cfg?.itemResponsive?.fieldBreakpoints).toEqual({ xs: 12, md: 12 });
  });

  it('renders CardStackContainer wrapping the form', () => {
    render(
      <FhirFormsRenderer
        questionnaire={mockQuestionnaire}
        isAuthenticated
        patientId='pat-1'
      />
    );
    const viewport = document.querySelector('.card-stack-viewport');
    expect(viewport).toBeInTheDocument();
    expect(
      viewport?.querySelector('[data-testid="mock-smart-form"]')
    ).not.toBeNull();
  });
});

describe('FhirFormsRenderer - Kirim removal and FAB dirty state', () => {
  type DirtyState = {
    label?: string;
    disabled?: boolean;
    onAction?: () => void;
    icon?: unknown;
  };
  let lastDirtyState: DirtyState | null | undefined;

  beforeEach(() => {
    setupBeforeEach();
    lastDirtyState = undefined;
  });

  const renderWithObserver = (extraProps?: Record<string, unknown>) =>
    render(
      <FabProvider>
        <FhirFormsRenderer
          questionnaire={mockQuestionnaire}
          isAuthenticated
          patientId='pat-1'
          {...extraProps}
        />
        <DirtyStateObserver
          onDirtyState={s => {
            lastDirtyState = s;
          }}
        />
      </FabProvider>
    );

  it('does not render a Kirim button', () => {
    renderWithObserver();
    expect(screen.queryByText('Kirim')).not.toBeInTheDocument();
  });

  it('does not set FAB action state on initial mount', () => {
    renderWithObserver();
    expect(lastDirtyState).toBeNull();
  });

  it('sets FAB action state after first form change interaction', () => {
    renderWithObserver();
    fireEvent.change(screen.getByTestId('mock-form-input'), {
      target: { value: 'a' }
    });
    expect(lastDirtyState).not.toBeNull();
    expect(lastDirtyState?.label).toBe('Submit');
    expect(lastDirtyState?.disabled).toBe(false);
    expect(typeof lastDirtyState?.onAction).toBe('function');
  });

  it('sets disabled=true when required items are empty', () => {
    vi.mocked(useRequiredValidation).mockReturnValue({
      requiredItemEmpty: 2,
      checkRequiredIsEmpty: vi.fn(),
      invalidItems: { q1: { issue: [{ code: 'required' }] } }
    } as any);
    renderWithObserver();
    fireEvent.change(screen.getByTestId('mock-form-input'), {
      target: { value: 'a' }
    });
    expect(lastDirtyState?.disabled).toBe(true);
  });

  it('sets disabled=true for practitioner without patientId', () => {
    render(
      <FabProvider>
        <FhirFormsRenderer
          questionnaire={mockQuestionnaire}
          isAuthenticated
          patientId=''
          role='Practitioner'
        />
        <DirtyStateObserver
          onDirtyState={s => {
            lastDirtyState = s;
          }}
        />
      </FabProvider>
    );
    fireEvent.change(screen.getByTestId('mock-form-input'), {
      target: { value: 'a' }
    });
    expect(lastDirtyState?.disabled).toBe(true);
  });

  it('provides icon component in action state after form interaction', () => {
    renderWithObserver();
    expect(lastDirtyState).toBeNull();
    fireEvent.change(screen.getByTestId('mock-form-input'), {
      target: { value: 'a' }
    });
    expect(typeof lastDirtyState?.icon).toMatch(/function|object/);
  });

  it('calls onAction from action state opens the drawer', () => {
    renderWithObserver();
    fireEvent.change(screen.getByTestId('mock-form-input'), {
      target: { value: 'a' }
    });
    act(() => {
      lastDirtyState?.onAction?.();
    });
    expect(screen.getByTestId('mock-drawer')).toBeInTheDocument();
  });
});
