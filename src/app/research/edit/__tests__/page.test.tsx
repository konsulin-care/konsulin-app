import { renderWithQuery } from '@/__tests__/react-test-utils';
import { scanSource } from '@/styles/__tests__/raw-color-scan';
import { screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import EditPage from '../page';

const __dirname = dirname(fileURLToPath(import.meta.url));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue('study-1')
  })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'test-practitioner-id',
        role_name: 'Researcher'
      }
    },
    isLoading: false
  })
}));

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header'>PageHeader</div>
}));

vi.mock('@/components/general/content-wraper', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='content-wrapper'>{children}</div>
  )
}));

vi.mock('../research-form', () => ({
  default: () => <div data-testid='edit-research-form'>EditResearchForm</div>
}));

vi.mock('@/services/api', () => ({
  getAPI: () =>
    Promise.resolve({
      get: vi.fn().mockResolvedValue({
        data: {
          resourceType: 'ResearchStudy',
          id: 'study-1',
          title: 'Test Study',
          description: 'A test study',
          status: 'active',
          protocol: [{ reference: 'PlanDefinition/plan-1' }]
        }
      })
    })
}));

describe('Edit Page', () => {
  it('renders page header and edit form for researcher', async () => {
    renderWithQuery(<EditPage />);

    await screen.findByTestId('edit-research-form');

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('edit-research-form')).toBeInTheDocument();
  });

  it('uses foreground and muted tokens instead of gray utilities', () => {
    const source = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');

    expect(scanSource(source)).toEqual([]);
    expect(source).toContain('text-foreground');
    expect(source).toContain('text-muted-foreground');
  });
});
