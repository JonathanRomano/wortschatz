"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import CircularProgress from "@mui/material/CircularProgress";

import { Card } from "@/components/ui/Card";
import { InlineLink } from "@/components/ui/InlineLink";
import { EXERCISE_TYPES, GENERATOR_LEVELS } from "@/lib/admin/schemas";
import {
  listSavedPrompts,
  listSessions,
  type SavedPromptDTO,
  type SessionListItem,
} from "@/lib/admin/client";

const PAGE_SIZE = 20;

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function HistoryClient() {
  const t = useTranslations("admin.history");
  const tf = useTranslations("admin.history.filters");
  const tc = useTranslations("admin.history.columns");
  const tTypes = useTranslations("exerciseTypes");

  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [savedPromptId, setSavedPromptId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [prompts, setPrompts] = useState<SavedPromptDTO[]>([]);

  useEffect(() => {
    listSavedPrompts().then((r) => {
      if (r.ok) setPrompts(r.prompts);
    });
  }, []);

  const load = useCallback(
    (p: number) => {
      setSessions(null);
      listSessions({
        type: type || undefined,
        level: level || undefined,
        savedPromptId: savedPromptId || undefined,
        from: from || undefined,
        to: to || undefined,
        page: String(p),
        pageSize: String(PAGE_SIZE),
      }).then((r) => {
        if (r.ok) {
          setSessions(r.sessions);
          setTotal(r.total);
        } else {
          setSessions([]);
          setTotal(0);
        }
      });
    },
    [type, level, savedPromptId, from, to],
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  const apply = () => {
    if (page === 1) load(1);
    else setPage(1);
  };
  const clear = () => {
    setType("");
    setLevel("");
    setSavedPromptId("");
    setFrom("");
    setTo("");
    if (page === 1) load(1);
    else setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Stack spacing={2}>
      <Card padding="md">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(5, 1fr)" },
            gap: 1.5,
          }}
        >
          <TextField select size="small" label={tf("type")} value={type} onChange={(e) => setType(e.target.value)}>
            <MenuItem value="">{tf("all")}</MenuItem>
            {EXERCISE_TYPES.map((ty) => (
              <MenuItem key={ty} value={ty}>
                {tTypes(ty)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label={tf("level")} value={level} onChange={(e) => setLevel(e.target.value)}>
            <MenuItem value="">{tf("all")}</MenuItem>
            {GENERATOR_LEVELS.map((lv) => (
              <MenuItem key={lv} value={lv}>
                {lv}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={tf("savedPrompt")}
            value={savedPromptId}
            onChange={(e) => setSavedPromptId(e.target.value)}
          >
            <MenuItem value="">{tf("all")}</MenuItem>
            {prompts.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            label={tf("from")}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            size="small"
            label={tf("to")}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" size="small" onClick={apply} sx={{ minHeight: 44 }}>
            {tf("apply")}
          </Button>
          <Button variant="outlined" size="small" onClick={clear} sx={{ minHeight: 44 }}>
            {tf("clear")}
          </Button>
        </Stack>
      </Card>

      {sessions === null ? (
        <Card padding="lg">
          <Stack sx={{ py: 3, alignItems: "center" }}>
            <CircularProgress />
          </Stack>
        </Card>
      ) : sessions.length === 0 ? (
        <Card padding="lg">
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("empty")}
          </Typography>
        </Card>
      ) : (
        <>
          {/* Cards — mobile/tablet */}
          <Box sx={{ display: { xs: "grid", lg: "none" }, gap: 1.5 }}>
            {sessions.map((s) => (
              <Card key={s.id} padding="md">
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {fmtDateTime(s.createdAt)}
                    </Typography>
                    <Chip label={s.source} size="small" />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
                    <Chip label={tTypes(s.type)} size="small" />
                    <Chip label={s.level} size="small" />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {s.topic ?? t("topicAuto")}
                    </Typography>
                  </Stack>
                  <Typography variant="body2">
                    {tc("prompt")}: {s.savedPromptName ?? t("adhoc")}
                  </Typography>
                  <Typography variant="body2">
                    {tc("result")}: {s.successCount}/{s.requestedCount}
                    {s.durationMs != null ? ` · ${Math.round(s.durationMs / 1000)}s` : ""}
                  </Typography>
                  <InlineLink href={`/admin/generate/history/${s.id}`} tone="primary">
                    {t("view")}
                  </InlineLink>
                </Stack>
              </Card>
            ))}
          </Box>

          {/* Table — desktop */}
          <Card padding="none" sx={{ display: { xs: "none", lg: "block" }, overflow: "hidden" }}>
            <TableContainer>
              <Table sx={{ minWidth: 820 }}>
                <TableHead sx={{ backgroundColor: "surfaceAlt.main" }}>
                  <TableRow>
                    {["created", "type", "level", "topic", "prompt", "result", "duration", "source"].map((c) => (
                      <TableCell key={c} sx={{ fontWeight: 500, color: "text.secondary" }}>
                        {tc(c)}
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{fmtDateTime(s.createdAt)}</TableCell>
                      <TableCell>{tTypes(s.type)}</TableCell>
                      <TableCell>{s.level}</TableCell>
                      <TableCell>{s.topic ?? t("topicAuto")}</TableCell>
                      <TableCell>{s.savedPromptName ?? t("adhoc")}</TableCell>
                      <TableCell>
                        {s.successCount}/{s.requestedCount}
                        {s.failureCount > 0 ? ` (−${s.failureCount})` : ""}
                      </TableCell>
                      <TableCell>{s.durationMs != null ? `${Math.round(s.durationMs / 1000)}s` : "—"}</TableCell>
                      <TableCell>
                        <Chip label={s.source} size="small" />
                      </TableCell>
                      <TableCell>
                        <InlineLink href={`/admin/generate/history/${s.id}`} tone="primary">
                          {t("view")}
                        </InlineLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Stack direction="row" spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
            <Button
              size="small"
              variant="outlined"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{ minHeight: 44 }}
            >
              ‹
            </Button>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {page} / {totalPages}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              sx={{ minHeight: 44 }}
            >
              ›
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
