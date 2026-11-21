import { useTheme, type Theme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { rendererThemeComponentOverrides } = vi.hoisted(() => ({
  rendererThemeComponentOverrides: vi.fn((_theme: Theme) => ({}))
}));

// Mock the renderer theme modules
vi.mock('@aehrc/smart-forms-renderer', () => ({
  rendererThemeOptions: {
    palette: { primary: { main: '#1976d2' } }
  },
  rendererThemeComponentOverrides
}));

import { AssessmentThemeProvider } from '../assessment-theme-provider';

function ThemeProbe() {
  const theme = useTheme();

  return <span data-testid='primary'>{theme.palette.primary.main}</span>;
}

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

  it('exposes the assessment theme to children via useTheme', () => {
    render(
      <AssessmentThemeProvider>
        <ThemeProbe />
      </AssessmentThemeProvider>
    );

    expect(screen.getByTestId('primary')).toHaveTextContent('#0F7981');
  });

  it('wraps children in the ScopedCssBaseline root', () => {
    const { container } = render(
      <AssessmentThemeProvider>
        <div data-testid='inner'>test</div>
      </AssessmentThemeProvider>
    );

    const baseline = container.querySelector('.MuiScopedCssBaseline-root');

    expect(baseline).not.toBeNull();
    expect(baseline).toContainElement(screen.getByTestId('inner'));
  });

  it('renders the ScopedCssBaseline wrapper when no children', () => {
    const { container } = render(<AssessmentThemeProvider />);

    expect(
      container.querySelector('.MuiScopedCssBaseline-root')
    ).not.toBeNull();
  });

  it('builds component overrides from the generated theme', () => {
    render(
      <AssessmentThemeProvider>
        <ThemeProbe />
      </AssessmentThemeProvider>
    );

    expect(rendererThemeComponentOverrides).toHaveBeenCalled();
    const theme = rendererThemeComponentOverrides.mock.calls[0][0];

    expect(theme.palette.primary.main).toBe('#0F7981');
    expect(theme.components).toBeDefined();
  });
});
