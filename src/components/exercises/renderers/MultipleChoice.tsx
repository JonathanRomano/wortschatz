"use client";

import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";

import type { RendererProps } from "../types";

export function MultipleChoiceRenderer({ content, value, onChange, disabled }: RendererProps) {
  const question = String(content.question ?? "");
  const options = (content.options as string[] | undefined) ?? [];
  const selected = typeof value.selectedIndex === "number" ? value.selectedIndex : -1;

  return (
    <Stack spacing={2}>
      <Typography
        variant="h4"
        component="p"
        sx={{
          fontSize: { xs: "1.125rem", sm: "1.5rem" },
          lineHeight: 1.5,
          fontWeight: 600,
        }}
      >
        {question}
      </Typography>
      <RadioGroup
        name="mc-option"
        value={selected === -1 ? "" : String(selected)}
        onChange={(_e, v) => onChange({ selectedIndex: Number(v) })}
      >
        <Stack spacing={1}>
          {options.map((opt, i) => {
            const checked = selected === i;
            return (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: 44,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 1,
                  border: 1,
                  borderStyle: "solid",
                  borderColor: checked ? "primary.main" : "divider",
                  backgroundColor: checked ? "accentSoft.main" : "background.paper",
                  transition: "all 150ms ease",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.6 : 1,
                  "&:hover": disabled
                    ? undefined
                    : {
                        transform: "translateY(-1px)",
                        backgroundColor: checked
                          ? "accentSoft.main"
                          : "surfaceAlt.main",
                      },
                  boxShadow: checked ? 1 : 0,
                }}
              >
                <FormControlLabel
                  value={String(i)}
                  control={<Radio disabled={disabled} />}
                  label={
                    <Typography variant="body1" sx={{ wordBreak: "break-word" }}>
                      {opt}
                    </Typography>
                  }
                  sx={{ m: 0, width: "100%", alignItems: "center", gap: 1 }}
                  disabled={disabled}
                />
              </Box>
            );
          })}
        </Stack>
      </RadioGroup>
    </Stack>
  );
}
