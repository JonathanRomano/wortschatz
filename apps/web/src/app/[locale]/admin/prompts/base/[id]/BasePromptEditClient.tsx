"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { Card } from "@/components/ui/Card";
import {
  createDraftVersion,
  getBasePrompt,
  publishVersion,
  revertVersion,
  testGenerateVersion,
  type BasePromptDetail,
  type BasePromptVersionDTO,
  type PromptStatusDTO,
  type TestGeneratedExercise,
} from "@/lib/admin/client";

const codeSx = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "monospace",
  fontSize: "0.78rem",
  m: 0,
  p: 1.5,
  borderRadius: 1,
  backgroundColor: "surfaceAlt.main",
} as const;

const statusColor: Record<PromptStatusDTO, "success" | "warning" | "default"> = {
  ACTIVE: "success",
  DRAFT: "warning",
  INACTIVE: "default",
};

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export function BasePromptEditClient({ id, role }: { id: string; role: string }) {
  const t = useTranslations("admin.basePrompts");
  const te = useTranslations("admin.basePrompts.editor");
  const tt = useTranslations("admin.basePrompts.test");
  const th = useTranslations("admin.basePrompts.history");
  const tTypes = useTranslations("exerciseTypes");
  const isAdmin = role === "ADMIN";

  const [detail, setDetail] = useState<BasePromptDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const didInit = useRef(false);

  const [system, setSystem] = useState("");
  const [userInstructions, setUserInstructions] = useState("");
  const [changeNote, setChangeNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  const [testTopic, setTestTopic] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ exercise: TestGeneratedExercise; tokenCost: number } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  const [pendingRevert, setPendingRevert] = useState<BasePromptVersionDTO | null>(null);
  const [reverting, setReverting] = useState(false);

  const load = useCallback(async () => {
    const res = await getBasePrompt(id);
    if (!res.ok) {
      setFailed(true);
      return;
    }
    setDetail(res.prompt);
    if (!didInit.current) {
      const draft = res.prompt.versions.find((v) => v.status === "DRAFT");
      const base = draft ?? res.prompt.activeVersion;
      setSystem(base?.systemPrompt ?? "");
      setUserInstructions(base?.userInstructions ?? "");
      didInit.current = true;
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const draft = detail?.versions.find((v) => v.status === "DRAFT") ?? null;

  const onSaveDraft = async () => {
    setSaving(true);
    setFeedback(null);
    const res = await createDraftVersion(id, {
      systemPrompt: system,
      userInstructions,
      changeNote: changeNote.trim() || undefined,
    });
    setSaving(false);
    if (res.ok) {
      setChangeNote("");
      setFeedback({ kind: "success", msg: te("draftSaved", { n: res.version.versionNumber }) });
      await load();
    } else {
      setFeedback({ kind: "error", msg: te("saveFailed") });
    }
  };

  const onPublish = async () => {
    if (!draft) return;
    setPublishing(true);
    setFeedback(null);
    const res = await publishVersion(id, draft.id);
    setPublishing(false);
    if (res.ok) {
      setFeedback({ kind: "success", msg: te("publishedToast", { n: res.version.versionNumber }) });
      await load();
    } else {
      setFeedback({ kind: "error", msg: te("saveFailed") });
    }
  };

  const onTest = async () => {
    if (!draft || !testTopic.trim()) return;
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    const res = await testGenerateVersion(id, draft.id, { topic: testTopic.trim() });
    setTesting(false);
    if (res.ok) setTestResult({ exercise: res.exercise, tokenCost: res.tokenCost });
    else setTestError(res.code === "rate_limited" ? tt("rate_limited") : tt("failed"));
  };

  const onRevert = async () => {
    if (!pendingRevert) return;
    setReverting(true);
    const res = await revertVersion(id, pendingRevert.id);
    setReverting(false);
    setPendingRevert(null);
    if (res.ok) {
      setFeedback({ kind: "success", msg: th("reverted", { n: res.version.versionNumber }) });
      await load();
    } else {
      setFeedback({ kind: "error", msg: th("revertFailed") });
    }
  };

  if (failed) {
    return (
      <Card padding="lg">
        <Typography sx={{ color: "error.main" }}>{t("loadFailed")}</Typography>
      </Card>
    );
  }
  if (!detail) {
    return (
      <Card padding="lg">
        <Stack sx={{ py: 3, alignItems: "center" }}>
          <CircularProgress />
        </Stack>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h2" sx={{ fontSize: { xs: "1.5rem", sm: "1.75rem" } }}>
          {tTypes(detail.type)}
        </Typography>
        <Chip size="small" label={detail.level} />
        <Chip
          size="small"
          color={detail.activeVersion ? "success" : "default"}
          label={
            detail.activeVersion
              ? te("activeLabel", { n: detail.activeVersion.versionNumber })
              : te("noActiveYet")
          }
        />
        {draft ? <Chip size="small" color="warning" label={t("draftPending")} /> : null}
      </Stack>

      {feedback ? <Alert severity={feedback.kind}>{feedback.msg}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) minmax(0, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* Editor */}
        <Card padding="md">
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2">{te("system")}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {te("systemHint")}
              </Typography>
              <TextField
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                multiline
                minRows={6}
                fullWidth
                sx={{ mt: 1 }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2">{te("userInstructions")}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {te("userInstructionsHint")}
              </Typography>
              <TextField
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                multiline
                minRows={10}
                fullWidth
                sx={{ mt: 1 }}
              />
            </Box>

            {/* Locked technical contract — read-only for everyone */}
            <Accordion disableGutters sx={{ boxShadow: "none", border: 1, borderColor: "divider" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {te("lockedTitle")}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {te("lockedHint")}
                  </Typography>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{te("jsonShape")}</Typography>
                    <Typography component="pre" variant="body2" sx={{ ...codeSx, opacity: 0.7 }}>
                      {detail.locked.jsonShape}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{te("rules")}</Typography>
                    <Typography component="pre" variant="body2" sx={{ ...codeSx, opacity: 0.7 }}>
                      {detail.locked.rules}
                    </Typography>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <TextField
              label={te("changeNote")}
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />

            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {te("publishHint")}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Button
                variant="outlined"
                onClick={onSaveDraft}
                disabled={saving || !system.trim() || !userInstructions.trim()}
                sx={{ minHeight: 44 }}
              >
                {saving ? te("saving") : te("saveDraft")}
              </Button>
              <Button
                variant="contained"
                onClick={onPublish}
                disabled={publishing || !draft}
                sx={{ minHeight: 44 }}
              >
                {publishing ? te("publishing") : te("publish")}
              </Button>
            </Stack>
          </Stack>
        </Card>

        {/* Test panel */}
        <Card padding="md">
          <Stack spacing={1.5}>
            <Typography variant="subtitle1">{tt("title")}</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {tt("subtitle")}
            </Typography>
            <TextField
              label={tt("topic")}
              placeholder={tt("topicPlaceholder")}
              value={testTopic}
              onChange={(e) => setTestTopic(e.target.value)}
              fullWidth
              size="small"
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <Button
              variant="contained"
              onClick={onTest}
              disabled={testing || !draft || !testTopic.trim()}
              sx={{ minHeight: 44 }}
            >
              {testing ? tt("generating") : tt("generate")}
            </Button>
            {!draft ? (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {tt("needDraft")}
              </Typography>
            ) : null}

            {testing ? (
              <Stack sx={{ py: 2, alignItems: "center" }}>
                <CircularProgress size={24} />
              </Stack>
            ) : testError ? (
              <Typography variant="body2" sx={{ color: "error.main" }}>{testError}</Typography>
            ) : testResult ? (
              <Card padding="sm">
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{testResult.exercise.title}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {tt("cost", { tokens: testResult.tokenCost })}
                  </Typography>
                  <Button size="small" variant="text" onClick={() => setShowJson((v) => !v)}>
                    {showJson ? tt("hideJson") : tt("showJson")}
                  </Button>
                  {showJson ? (
                    <Typography component="pre" variant="body2" sx={codeSx}>
                      {JSON.stringify(
                        {
                          content: testResult.exercise.content,
                          solution: testResult.exercise.solution,
                          explanation: testResult.exercise.explanation,
                          tags: testResult.exercise.tags,
                          tip: testResult.exercise.tip,
                        },
                        null,
                        2,
                      )}
                    </Typography>
                  ) : null}
                </Stack>
              </Card>
            ) : (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {tt("empty")}
              </Typography>
            )}
          </Stack>
        </Card>
      </Box>

      {/* Version history */}
      <Box>
        <Typography variant="h3" sx={{ fontSize: "1.25rem", mb: 1 }}>
          {th("title")}
        </Typography>
        <Stack spacing={1}>
          {detail.versions.map((v) => (
            <Accordion key={v.id} disableGutters sx={{ boxShadow: "none", border: 1, borderColor: "divider" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5, width: "100%" }}
                >
                  <Typography variant="subtitle2">{t("version", { n: v.versionNumber })}</Typography>
                  <Chip
                    size="small"
                    color={statusColor[v.status]}
                    label={th(
                      v.status === "ACTIVE" ? "active" : v.status === "DRAFT" ? "draft" : "inactive",
                    )}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {fmtDate(v.createdAt)}
                    {v.authorEmail ? ` · ${t("by", { email: v.authorEmail })}` : ""}
                    {v.changeNote ? ` · ${v.changeNote}` : ""}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{te("system")}</Typography>
                    <Typography component="pre" variant="body2" sx={codeSx}>{v.systemPrompt}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{te("userInstructions")}</Typography>
                    <Typography component="pre" variant="body2" sx={codeSx}>{v.userInstructions}</Typography>
                  </Box>
                  {isAdmin && v.status === "INACTIVE" ? (
                    <Box>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => setPendingRevert(v)}
                        sx={{ minHeight: 44 }}
                      >
                        {th("revert")}
                      </Button>
                    </Box>
                  ) : null}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Box>

      {/* Revert confirmation */}
      <Dialog open={!!pendingRevert} onClose={reverting ? undefined : () => setPendingRevert(null)}>
        <DialogTitle>{th("confirmTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {pendingRevert ? th("confirmBody", { n: pendingRevert.versionNumber }) : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingRevert(null)} disabled={reverting} sx={{ minHeight: 44 }}>
            {th("cancel")}
          </Button>
          <Button
            onClick={onRevert}
            color="warning"
            variant="contained"
            disabled={reverting}
            sx={{ minHeight: 44 }}
          >
            {reverting ? th("reverting") : th("confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
