import { createTheme, type Theme } from "@mui/material/styles";

import "./augmentation";
import { lightPalette, darkPalette } from "./palette";
import { typography } from "./typography";
import { shape, RADIUS_CARD } from "./shape";
import { shadows } from "./shadows";

export type ThemeMode = "light" | "dark";

/**
 * Build the application theme for a given color mode. Both palettes are
 * already wired so callers in Task 2 can swap modes without touching
 * theme code.
 */
export function createAppTheme(mode: ThemeMode): Theme {
  const palette = mode === "dark" ? darkPalette : lightPalette;

  return createTheme({
    palette,
    typography,
    shape,
    shadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            WebkitTextSizeAdjust: "100%",
            textSizeAdjust: "100%",
          },
          body: {
            // 16px floor everywhere (iOS Safari input-zoom defense).
            fontSize: 16,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            // Prevent accidental horizontal scroll without breaking
            // sticky positioning of the header.
            overflowX: "clip",
            minHeight: "100vh",
          },
          // iOS Safari zooms on focus when input font-size < 16px.
          "input, select, textarea": {
            fontSize: 16,
          },
          a: {
            color: "inherit",
            textDecoration: "none",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: false,
          disableRipple: false,
        },
        styleOverrides: {
          root: {
            borderRadius: shape.borderRadius,
            transition:
              "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
            "&:hover": {
              transform: "translateY(-1px)",
            },
            "&.Mui-disabled": {
              transform: "none",
            },
          },
          sizeSmall: {
            minHeight: 36,
            paddingLeft: 12,
            paddingRight: 12,
          },
          sizeMedium: {
            minHeight: 44,
            paddingLeft: 20,
            paddingRight: 20,
          },
          sizeLarge: {
            minHeight: 48,
            paddingLeft: 24,
            paddingRight: 24,
            fontSize: "1rem",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            // Touch-target floor.
            minWidth: 44,
            minHeight: 44,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          rounded: {
            borderRadius: RADIUS_CARD,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS_CARD,
            backgroundImage: "none",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
          sizeSmall: {
            fontSize: "0.75rem",
          },
        },
      },
      MuiAppBar: {
        defaultProps: {
          color: "default",
          elevation: 0,
        },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            backgroundImage: "none",
          }),
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 56,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          size: "medium",
          fullWidth: true,
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: shape.borderRadius,
            backgroundColor: "var(--mui-palette-background-paper, transparent)",
          },
          input: {
            fontSize: 16,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            fontSize: 16,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: shape.borderRadius,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 44,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: "0.75rem",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: shape.borderRadius,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: RADIUS_CARD,
            backgroundImage: "none",
          },
        },
      },
      MuiLink: {
        defaultProps: {
          underline: "hover",
        },
      },
    },
  });
}
