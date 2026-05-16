import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
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
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { AdminExerciseRow } from "./AdminExerciseRow";
import { AdminAdjustForm } from "./AdminAdjustForm";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations("admin");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Card padding="lg" sx={{ textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            {t("noPermission")}
          </Typography>
        </Card>
      </Container>
    );
  }

  const [exercises, users] = await Promise.all([
    prisma.exercise.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        type: true,
        level: true,
        status: true,
        createdAt: true,
      },
    }),
    role === "ADMIN"
      ? prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, email: true, name: true, role: true, muenzen: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5 } }}>
      <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
        {t("title")}
      </Typography>

      <Box component="section" sx={{ mt: 4 }}>
        <Typography variant="h4">{t("exercises")}</Typography>
        <Card padding="sm" sx={{ mt: 1.5 }}>
          <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
            {exercises.map((ex) => (
              <AdminExerciseRow
                key={ex.id}
                id={ex.id}
                title={ex.title}
                type={ex.type}
                level={ex.level}
                status={ex.status}
              />
            ))}
          </Stack>
        </Card>
      </Box>

      {role === "ADMIN" ? (
        <Box component="section" sx={{ mt: 5 }}>
          <Typography variant="h4">{t("users")}</Typography>

          {/* Card list — mobile + tablet */}
          <Box
            sx={{
              mt: 1.5,
              display: { xs: "grid", lg: "none" },
              gap: 1.5,
            }}
          >
            {users.map((u) => (
              <Card key={u.id} padding="md">
                <Typography
                  variant="body2"
                  sx={{ wordBreak: "break-all", fontWeight: 500 }}
                >
                  {u.email}
                </Typography>
                <Box
                  component="dl"
                  sx={{
                    mt: 1,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1,
                    m: 0,
                    "& > div": { m: 0 },
                  }}
                >
                  <Box>
                    <Typography component="dt" variant="caption" sx={{ color: "text.secondary" }}>
                      Name
                    </Typography>
                    <Typography component="dd" variant="body2" sx={{ mt: 0.25, wordBreak: "break-word" }}>
                      {u.name ?? "—"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography component="dt" variant="caption" sx={{ color: "text.secondary" }}>
                      Role
                    </Typography>
                    <Typography component="dd" variant="body2" sx={{ mt: 0.25 }}>
                      {u.role}
                    </Typography>
                  </Box>
                  <Box sx={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography component="dt" variant="caption" sx={{ color: "text.secondary" }}>
                      Münzen
                    </Typography>
                    <Box component="dd" sx={{ m: 0 }}>
                      <MuenzenBadge amount={u.muenzen} size="sm" />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ mt: 1.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
                  >
                    {t("adjust.title")}
                  </Typography>
                  <AdminAdjustForm userId={u.id} size="stacked" />
                </Box>
              </Card>
            ))}
          </Box>

          {/* Table — desktop only */}
          <Card
            padding="none"
            sx={{
              mt: 1.5,
              display: { xs: "none", lg: "block" },
              overflow: "hidden",
            }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 640 }}>
                <TableHead sx={{ backgroundColor: "surfaceAlt.main" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>
                      Email
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>
                      Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>
                      Role
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: "text.secondary" }}>
                      Münzen
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>
                      {t("adjust.title")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell sx={{ wordBreak: "break-all" }}>{u.email}</TableCell>
                      <TableCell>{u.name ?? "—"}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell align="right">
                        <MuenzenBadge amount={u.muenzen} size="sm" />
                      </TableCell>
                      <TableCell>
                        <AdminAdjustForm userId={u.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      ) : null}
    </Container>
  );
}
