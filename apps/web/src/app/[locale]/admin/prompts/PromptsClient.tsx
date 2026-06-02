"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { Card } from "@/components/ui/Card";
import {
  deleteSavedPrompt,
  listSavedPrompts,
  type SavedPromptDTO,
} from "@/lib/admin/client";

import { SavePromptDialog, type SavePromptInitial } from "../SavePromptDialog";

function fmtDate(iso: string | null | undefined, never: string): string {
  if (!iso) return never;
  return new Date(iso).toLocaleDateString();
}

export function PromptsClient() {
  const t = useTranslations("admin.prompts");
  const tc = useTranslations("admin.prompts.columns");
  const tTypes = useTranslations("exerciseTypes");
  const tSave = useTranslations("admin.generate.save");

  const [prompts, setPrompts] = useState<SavedPromptDTO[] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SavePromptInitial | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<SavedPromptDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => listSavedPrompts().then((r) => setPrompts(r.ok ? r.prompts : []));
  useEffect(() => {
    refresh();
  }, []);

  const onSaved = (p: SavedPromptDTO) =>
    setPrompts((prev) => [p, ...(prev ?? []).filter((x) => x.id !== p.id)]);

  const openNew = () => {
    setEditing(undefined);
    setEditorOpen(true);
  };
  const openEdit = (p: SavedPromptDTO) => {
    setEditing({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type as SavePromptInitial["type"],
      systemPrompt: p.systemPrompt,
      userInstructions: p.userInstructions,
    });
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await deleteSavedPrompt(pendingDelete.id);
    setDeleting(false);
    if (res.ok) setPrompts((prev) => (prev ?? []).filter((x) => x.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const rows = useMemo(() => prompts ?? [], [prompts]);

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={openNew} sx={{ minHeight: 44 }}>
          {t("new")}
        </Button>
      </Box>

      {prompts === null ? (
        <Card padding="lg">
          <Stack sx={{ py: 3, alignItems: "center" }}>
            <CircularProgress />
          </Stack>
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
                  <Typography variant="subtitle2">{p.name}</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
                    <Chip label={tTypes(p.type)} size="small" />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {tc("useCount")}: {p.useCount} · {tc("lastUsed")}: {fmtDate(p.lastUsedAt, t("never"))}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => openEdit(p)} sx={{ minHeight: 44 }}>
                      {t("edit")}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setPendingDelete(p)}
                      sx={{ minHeight: 44 }}
                    >
                      {t("delete")}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Box>

          {/* Table — desktop */}
          <Card padding="none" sx={{ display: { xs: "none", lg: "block" }, overflow: "hidden" }}>
            <TableContainer>
              <Table sx={{ minWidth: 720 }}>
                <TableHead sx={{ backgroundColor: "surfaceAlt.main" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("name")}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("type")}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("useCount")}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("lastUsed")}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("created")}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: "text.secondary" }}>{tc("actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{tTypes(p.type)}</TableCell>
                      <TableCell align="right">{p.useCount}</TableCell>
                      <TableCell>{fmtDate(p.lastUsedAt, t("never"))}</TableCell>
                      <TableCell>{fmtDate(p.createdAt, t("never"))}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={() => openEdit(p)} sx={{ minHeight: 44 }}>
                            {t("edit")}
                          </Button>
                          <Button size="small" color="error" onClick={() => setPendingDelete(p)} sx={{ minHeight: 44 }}>
                            {t("delete")}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      <SavePromptDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={onSaved}
        initial={editing}
      />

      <Dialog open={!!pendingDelete} onClose={deleting ? undefined : () => setPendingDelete(null)}>
        <DialogTitle>{t("delete")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t("confirmDelete")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} disabled={deleting} sx={{ minHeight: 44 }}>
            {tSave("cancel")}
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting} sx={{ minHeight: 44 }}>
            {t("delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
