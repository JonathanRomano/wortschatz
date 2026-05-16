"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";

import type { RendererProps } from "../types";

export function FillInTheBlankRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const sentence = String(content.sentence ?? "");
  const blanksCount = Number(content.blanksCount ?? sentence.split("___").length - 1);
  const blanks = Array.isArray(value.blanks)
    ? (value.blanks as string[])
    : Array(blanksCount).fill("");

  const setBlank = (i: number, v: string) => {
    const next = [...blanks];
    next[i] = v;
    onChange({ blanks: next });
  };

  const parts = sentence.split("___");
  return (
    <Stack spacing={2}>
      {/* component="div", not "p". The sentence interleaves TextField
          inputs (which render as <div>) with text, and <div> inside
          <p> is invalid HTML — browsers auto-close the <p> and React
          flags it as a hydration mismatch. */}
      <Typography
        variant="h4"
        component="div"
        sx={{
          fontSize: { xs: "1.125rem", sm: "1.5rem" },
          fontFamily: "var(--font-fraunces), serif",
          lineHeight: 1.55,
          fontWeight: 400,
        }}
      >
        {parts.map((part, i) => (
          <Box component="span" key={i} sx={{ wordBreak: "break-word" }}>
            {part}
            {i < parts.length - 1 && (
              <TextField
                variant="standard"
                value={blanks[i] ?? ""}
                onChange={(e) => setBlank(i, e.target.value)}
                disabled={disabled}
                slotProps={{
                  htmlInput: {
                    autoCapitalize: "none",
                    autoCorrect: "off",
                    spellCheck: false,
                    "aria-label": t("blankAria", { n: i + 1 }),
                  },
                }}
                sx={{
                  mx: 0.5,
                  display: "inline-block",
                  width: { xs: "10rem", sm: "8rem" },
                  verticalAlign: "baseline",
                  "& .MuiInputBase-root": {
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "1rem",
                    "&:before": {
                      borderBottomWidth: 2,
                      borderBottomColor: "secondary.main",
                      opacity: 0.7,
                    },
                    "&:hover:not(.Mui-disabled, .Mui-error):before": {
                      borderBottomWidth: 2,
                      borderBottomColor: "secondary.main",
                    },
                    "&:after": {
                      borderBottomColor: "secondary.main",
                    },
                  },
                }}
              />
            )}
          </Box>
        ))}
      </Typography>
      {content.hint ? (
        <Box
          sx={{
            borderRadius: 1,
            border: 1,
            borderStyle: "solid",
            borderColor: "secondary.main",
            backgroundColor: "accentSoft.main",
            px: 1.5,
            py: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            <Typography component="span" sx={{ fontWeight: 600, color: "secondary.main" }}>
              {t("hint")}:
            </Typography>{" "}
            {String(content.hint)}
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}
