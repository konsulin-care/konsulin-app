import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the renderer theme modules
vi.mock('@aehrc/smart-forms-renderer', () => ({
  RendererThemeProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  rendererThemeOptions: {
    palette: { primary: { main: '#1976d2' } }
  },
  rendererThemeComponentOverrides: vi.fn(() => ({}))
}));

import { AssessmentThemeProvider } from '../assessment-theme-provider';

describe('AssessmentThemeProvider', () => {
  it('renders children inside the theme context', () => {
    render(
      <AssessmentThemeProvider>
        <div data-testid='child'>Hello</div>
      </AssessmentThemeProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('renders nothing when no children', () => {
    const { container } = render(<AssessmentThemeProvider />);

    // With mocked RendererThemeProvider as fragment, no children = empty
    expect(container.innerHTML).toBe('');
  });

  it('renders children with RendererThemeProvider wrapper', () => {
    const { container } = render(
      <AssessmentThemeProvider>
        <div data-testid='inner'>test</div>
      </AssessmentThemeProvider>
    );

    // Since RendererThemeProvider is mocked as a fragment,
    // children should be directly in the DOM
    expect(container.textContent).toBe('test');
  });
});
