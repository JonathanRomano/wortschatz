import type { ReactNode } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Card } from "@/components/ui/Card";

// Lightweight server-friendly wrapper around `<Card>`. Sets up the
// title row + body slot every chart panel needs, so the four chart
// clients can focus purely on their drawing logic.

type Props = {
  title: string;
  subtitle?: string;
  // Optional element rendered to the right of the title — used for
  // legends, switches, or pills if any chart wants one later.
  trailing?: ReactNode;
  children: ReactNode;
};

export function ChartCard({ title, subtitle, trailing, children }: Props) {
  return (
    <Card sx={{ height: "100%" }}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
        {trailing ?? null}
      </Stack>
      {children}
    </Card>
  );
}
