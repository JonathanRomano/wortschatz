import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { MuenzenReason, Prisma } from "@prisma/client";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";

const PAGE_SIZE = 20;

const ALL_REASONS: readonly MuenzenReason[] = [
  "EXERCISE_COMPLETE",
  "PERFECT_SCORE_BONUS",
  "DAILY_STREAK",
  "SPENT_AI_REVIEW",
  "ADMIN_ADJUSTMENT",
  "BONUS",
];

function parseReason(raw: string | undefined): MuenzenReason | null {
  if (!raw) return null;
  return (ALL_REASONS as readonly string[]).includes(raw)
    ? (raw as MuenzenReason)
    : null;
}

function parsePage(raw: string | undefined): number {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function HistoricoPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const userId = session.user.id;

  const t = await getTranslations("profile.history");
  const tProfile = await getTranslations("profile");

  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const typeRaw = Array.isArray(sp.type) ? sp.type[0] : sp.type;
  const page = parsePage(pageRaw);
  const reasonFilter = parseReason(typeRaw);

  const where: Prisma.MuenzenTransactionWhereInput = {
    userId,
    ...(reasonFilter ? { reason: reasonFilter } : {}),
  };

  // Fetch PAGE_SIZE + 1 to detect "has next page" without a count query.
  const rows = await prisma.muenzenTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    skip: (page - 1) * PAGE_SIZE,
  });
  const hasNext = rows.length > PAGE_SIZE;
  const transactions = hasNext ? rows.slice(0, PAGE_SIZE) : rows;

  const buildHref = (next: { page?: number; type?: string | null }) => {
    const u = new URLSearchParams();
    if (next.page && next.page > 1) u.set("page", String(next.page));
    if (next.type) u.set("type", next.type);
    const qs = u.toString();
    return qs ? `/profile/historico?${qs}` : "/profile/historico";
  };

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 5 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
        }}
      >
        <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
          {t("title")}
        </Typography>
        <ButtonLink
          href="/profile"
          variant="outlined"
          size="small"
          sx={{ minHeight: 44 }}
        >
          {tProfile("title")}
        </ButtonLink>
      </Stack>

      {/* Filter row — chip-style links keep state in URL search params. */}
      <Box sx={{ mt: 2.5 }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 0.75 }}
        >
          {t("filterLabel")}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ flexWrap: "wrap", gap: 0.75 }}
        >
          <FilterChip
            href={buildHref({ type: null })}
            label={t("filterAll")}
            active={!reasonFilter}
          />
          {ALL_REASONS.map((r) => (
            <FilterChip
              key={r}
              href={buildHref({ type: r })}
              label={t(`reason.${r}` as const)}
              active={reasonFilter === r}
            />
          ))}
        </Stack>
      </Box>

      {transactions.length === 0 ? (
        <Card padding="lg" sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            {t("empty")}
          </Typography>
        </Card>
      ) : (
        <>
          {/* Mobile + tablet: stacked card list. */}
          <Stack spacing={1.5} sx={{ mt: 3, display: { xs: "flex", md: "none" } }}>
            {transactions.map((tx) => (
              <Card key={tx.id} padding="md">
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ justifyContent: "space-between", alignItems: "center" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {t(`reason.${tx.reason}` as const)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      {dateFormatter.format(tx.createdAt)}
                    </Typography>
                  </Box>
                  <AmountText amount={tx.amount} />
                </Stack>
                {tx.refId && tx.reason === "ADMIN_ADJUSTMENT" ? (
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.75,
                      display: "block",
                      color: "text.secondary",
                      wordBreak: "break-word",
                    }}
                  >
                    {tx.refId}
                  </Typography>
                ) : null}
              </Card>
            ))}
          </Stack>

          {/* Desktop: tabular layout. */}
          <Card
            padding="none"
            sx={{
              mt: 3,
              display: { xs: "none", md: "block" },
              overflow: "hidden",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: "surfaceAlt.main" }}>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 500, color: "text.secondary" }}
                    >
                      {t("title")}
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 500, color: "text.secondary" }}
                    >
                      Date
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 500, color: "text.secondary" }}
                    >
                      M
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500 }}
                        >
                          {t(`reason.${tx.reason}` as const)}
                        </Typography>
                        {tx.refId && tx.reason === "ADMIN_ADJUSTMENT" ? (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              display: "block",
                              wordBreak: "break-word",
                            }}
                          >
                            {tx.refId}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {dateFormatter.format(tx.createdAt)}
                      </TableCell>
                      <TableCell align="right">
                        <AmountText amount={tx.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ mt: 3, justifyContent: "space-between", alignItems: "center" }}
      >
        <ButtonLink
          href={buildHref({ page: page - 1, type: reasonFilter ?? null })}
          variant="outlined"
          size="small"
          // The disabled prop on ButtonLink isn't supported (it would emit
          // an anchor with `disabled`), so we omit the link itself when
          // there's no previous page.
          sx={{
            minHeight: 44,
            visibility: page > 1 ? "visible" : "hidden",
          }}
        >
          {t("previous")}
        </ButtonLink>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {t("page", { page })}
        </Typography>
        <ButtonLink
          href={buildHref({ page: page + 1, type: reasonFilter ?? null })}
          variant="outlined"
          size="small"
          sx={{
            minHeight: 44,
            visibility: hasNext ? "visible" : "hidden",
          }}
        >
          {t("next")}
        </ButtonLink>
      </Stack>
    </Container>
  );
}

function AmountText({ amount }: { amount: number }) {
  const positive = amount > 0;
  return (
    <Typography
      component="span"
      sx={{
        fontFamily:
          'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
        fontVariantNumeric: "tabular-nums",
        fontWeight: 600,
        color: positive ? "success.main" : "error.main",
      }}
    >
      {positive ? `+${amount}` : amount} M
    </Typography>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <ButtonLink
      href={href}
      variant={active ? "contained" : "outlined"}
      color={active ? "primary" : "inherit"}
      size="small"
      sx={{
        minHeight: 32,
        py: 0.25,
        px: 1.25,
        borderRadius: 9999,
        textTransform: "none",
        fontWeight: 500,
        lineHeight: 1.2,
      }}
    >
      {label}
    </ButtonLink>
  );
}
