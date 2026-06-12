"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import CircularProgress from "@mui/material/CircularProgress";

import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { listBasePrompts, type BasePromptListItem } from "@/lib/admin/client";
import { EXERCISE_TYPES, GENERATOR_LEVELS } from "@/lib/admin/schemas";

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

function StatusChips({ p }: { p: BasePromptListItem }) {
  const t = useTranslations("admin.basePrompts");
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
      <Chip
        size="small"
        color={p.activeVersionNumber ? "success" : "default"}
        label={
          p.activeVersionNumber
            ? t("version", { n: p.activeVersionNumber })
            : t("noActive")
        }
      />
      {p.hasDraftPending ? (
        <Chip size="small" color="warning" label={t("draftPending")} />
      ) : null}
    </Stack>
  );
}

export function BasePromptsClient() {
  const t = useTranslations("admin.basePrompts");
  const tc = useTranslations("admin.basePrompts.columns");
  const tf = useTranslations("admin.basePrompts.filters");
  const tTypes = useTranslations("exerciseTypes");

  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [draftsOnly, setDraftsOnly] = useState(false);
  const [rows, setRows] = useState<BasePromptListItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setRows(null);
    setFailed(false);
    const res = await listBasePrompts({
      type: type || undefined,
      level: level || undefined,
      hasDraft: draftsOnly ? "true" : undefined,
    });
    if (res.ok) setRows(res.prompts);
    else {
      setRows([]);
      setFailed(true);
    }
  }, [type, level, draftsOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack spacing={2}>
      {/* Filters */}
      <Card padding="md">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr auto" },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            select
            size="small"
            label={tf("type")}
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
          >
            <MenuItem value="">{tf("all")}</MenuItem>
            {EXERCISE_TYPES.map((ty) => (
              <MenuItem key={ty} value={ty}>
                {tTypes(ty)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={tf("level")}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            fullWidth
          >
            <MenuItem value="">{tf("all")}</MenuItem>
            {GENERATOR_LEVELS.map((lv) => (
              <MenuItem key={lv} value={lv}>
                {lv}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={draftsOnly}
                onChange={(e) => setDraftsOnly(e.target.checked)}
              />
            }
            label={tf("draftsOnly")}
          />
        </Box>
      </Card>

      {rows === null ? (
        <Card padding="lg">
          <Stack sx={{ py: 3, alignItems: "center" }}>
            <CircularProgress />
          </Stack>
        </Card>
      ) : failed ? (
        <Card padding="lg">
          <Typography sx={{ color: "error.main" }}>{t("loadFailed")}</Typography>
        </Card>
      ) : rows.length === 0 ? (
        <Card padding="lg">
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("empty")}
          </Typography>
        </Card>
      ) : (
        <>
          {/* Cards — mobile/tablet */}
          <Box sx={{ display: { xs: "grid", lg: "none" }, gap: 1.5 }}>
            {rows.map((p) => (
              <Card key={p.id} padding="md">
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}
                  >
                    <Typography variant="subtitle2">{tTypes(p.type)}</Typography>
                    <Chip size="small" label={p.level} />
                  </Stack>
                  <StatusChips p={p} />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {tc("lastEdited")}: {fmtDate(p.lastEditedAt)}
                    {p.lastEditedByEmail ? ` · ${t("by", { email: p.lastEditedByEmail })}` : ""}
                  </Typography>
                  <Box>
                    <ButtonLink
                      href={`/admin/prompts/base/${p.id}`}
                      variant="outlined"
                      size="small"
                      sx={{ minHeight: 44 }}
                    >
                      {t("open")}
                    </ButtonLink>
                  </Box>
                </Stack>
              </Card>
            ))}
          </Box>

          {/* Table — desktop */}
          <Card
            padding="none"
            sx={{ display: { xs: "none", lg: "block" }, overflow: "hidden" }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 760 }}>
                <TableHead sx={{ backgroundColor: "surfaceAlt.main" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("type")}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("level")}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("status")}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("lastEdited")}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>{tTypes(p.type)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={p.level} />
                      </TableCell>
                      <TableCell>
                        <StatusChips p={p} />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0}>
                          <Typography variant="body2">{fmtDate(p.lastEditedAt)}</Typography>
                          {p.lastEditedByEmail ? (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {t("by", { email: p.lastEditedByEmail })}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <ButtonLink
                          href={`/admin/prompts/base/${p.id}`}
                          variant="outlined"
                          size="small"
                          sx={{ minHeight: 44 }}
                        >
                          {t("edit")}
                        </ButtonLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
    </Stack>
  );
}
