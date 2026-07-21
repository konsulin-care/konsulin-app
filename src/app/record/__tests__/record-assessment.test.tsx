/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock heavy dependencies
vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api/assessment', () => ({
  useQuestionnaireResponse: vi.fn(),
  RESULT_BRIEF_LOGIN_REQUIRED: 'Login required',
  RESULT_BRIEF_PLACEHOLDER: 'Waiting...'
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: {
    uiPreferences: 'uiPreferences',
    serviceRequests: 'serviceRequests'
  },
  dbGet: vi.fn().mockResolvedValue(),
  dbSet: vi.fn(),
  dbDelete: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({ data: undefined, isLoading: false })
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: () => <div />
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div />
}));

vi.mock('lucide-react', () => ({
  NotepadTextIcon: () => <div data-testid='notepad-icon' />
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid='markdown'>{children}</div>
  )
}));

import { useAuth } from '@/context/auth/authContext';
import { useQuestionnaireResponse } from '@/services/api/assessment';
import RecordAssessment from '../record-assessment';

describe('RecordAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Patient', userId: 'patient-1' }
      },
      isLoading: false
    } as any);

    vi.mocked(useQuestionnaireResponse).mockReturnValue({
      data: null,
      isLoading: false
    } as any);
  });

  it('renders assessment content', () => {
    render(<RecordAssessment recordId='qr-1' />);
    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });
});
