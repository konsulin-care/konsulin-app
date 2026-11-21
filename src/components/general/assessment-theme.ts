import {
  rendererThemeComponentOverrides,
  rendererThemeOptions
} from '@aehrc/smart-forms-renderer';
import {
  createTheme,
  type Theme,
  type ThemeOptions
} from '@mui/material/styles';

import { TOKENS } from '@/styles/tokens';

const FONT_FAMILY = 'var(--font-jakarta), sans-serif';

const brand = {
  main: TOKENS.turquoiseDeep,
  light: TOKENS.turquoiseTint,
  dark: TOKENS.turquoiseDeep,
  contrastText: TOKENS.surface
};

const base = rendererThemeOptions.typography;
const typography =
  typeof base === 'object'
    ? { ...base, fontFamily: FONT_FAMILY }
    : { fontFamily: FONT_FAMILY };

const options: ThemeOptions = {
  ...rendererThemeOptions,
  palette: {
    ...rendererThemeOptions.palette,
    primary: brand,
    secondary: brand,
    success: brand,
    info: brand,
    error: {
      main: TOKENS.danger,
      light: TOKENS.dangerTint,
      dark: TOKENS.danger,
      contrastText: TOKENS.surface
    },
    warning: {
      main: TOKENS.warningDeep,
      light: TOKENS.warningTint,
      dark: TOKENS.warningDeep,
      contrastText: TOKENS.surface
    },
    text: {
      primary: TOKENS.charcoal900,
      secondary: TOKENS.charcoal700,
      disabled: TOKENS.charcoal400
    },
    divider: TOKENS.charcoal200,
    background: { default: TOKENS.paper, paper: TOKENS.surface },
    grey: {
      100: TOKENS.charcoal100,
      200: TOKENS.charcoal200,
      300: TOKENS.charcoal200,
      400: TOKENS.charcoal400,
      500: TOKENS.charcoal400,
      600: TOKENS.charcoal600,
      700: TOKENS.charcoal700,
      800: TOKENS.charcoal900,
      900: TOKENS.charcoal900
    }
  },
  shape: { borderRadius: 8 },
  typography
};

/**
 * Builds the MUI theme used by the smart-forms renderer for assessments and
 * SOAP forms.
 *
 * The renderer's exported options are merged first so MUI can derive
 * light/dark/contrast variants and typography variants from our token values,
 * then the renderer component overrides are applied on top of the created
 * theme.
 *
 * @returns The fully built MUI theme with renderer and assessment overrides.
 */
export function createAssessmentTheme(): Theme {
  const theme = createTheme(options);
  const rendererOverrides = rendererThemeComponentOverrides(
    theme
  ) as Theme['components'];

  theme.components = {
    ...rendererOverrides,
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 8,
          marginLeft: 0,
          marginRight: 0,
          paddingRight: 12,
          '&:has(.Mui-checked)': {
            backgroundColor: TOKENS.turquoiseTint,
            boxShadow: `inset 0 0 0 1px ${TOKENS.turquoiseDeep}`
          }
        }
      }
    }
  };

  return theme;
}
