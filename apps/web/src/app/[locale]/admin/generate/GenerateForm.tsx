"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Autocomplete from "@mui/material/Autocomplete";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { PROFESSION_SLUGS, type ProfessionSlug } from "@wortschatz/config";

import { Card } from "@/components/ui/Card";
import { EXERCISE_TYPES, GENERATOR_LEVELS } from "@/lib/admin/schemas";
import { generateExercises, type SavedPromptDTO } from "@/lib/admin/client";
import type { GenerateRequestInput, PreviewRequestInput } from "@/lib/admin/schemas";
import type { GenerationResult } from "@scripts/shared/types";

import { SavePromptDialog } from "../SavePromptDialog";
import { PreviewDialog } from "./PreviewDialog";

type ExType = (typeof EXERCISE_TYPES)[number];
type Level = (typeof GENERATOR_LEVELS)[number];

export function GenerateForm({
  topicsByLevel,
  savedPrompts,
  loading,
  setLoading,
  onResult,
  onError,
  onPromptSaved,
}: {
  topicsByLevel: Record<Level, string[]>;
  savedPrompts: SavedPromptDTO[];
  loading: boolean;
  setLoading: (v: boolean) => void;
  onResult: (r: GenerationResult) => void;
  onError: (code: string | null) => void;
  onPromptSaved: (p: SavedPromptDTO) => void;
}) {
  const t = useTranslations("admin.generate.form");
  const tTypes = useTranslations("exerciseTypes");
  const tProfessions = useTranslations("professions");

  const [type, setType] = useState<ExType>("FILL_IN_THE_BLANK");
  const [level, setLevel] = useState<Level>("A2");
  const [topic, setTopic] = useState("");
  const [profession, setProfession] = useState<ProfessionSlug | "">("");
  const [count, setCount] = useState(5);
  const [savedPromptId, setSavedPromptId] = useState("");
  const [system, setSystem] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [noRecent, setNoRecent] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReq, setPreviewReq] = useState<PreviewRequestInput | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);

  // Saved prompts are per-type; drop the selection when the type changes.
  const promptsForType = useMemo(
    () => savedPrompts.filter((p) => p.type === type),
    [savedPrompts, type],
  );
  const effectiveSavedId = promptsForType.some((p) => p.id === savedPromptId)
    ? savedPromptId
    : "";

  const customPrompt =
    system.trim() || instructions.trim()
      ? {
          ...(system.trim() ? { system } : {}),
          ...(instructions.trim() ? { userInstructions: instructions } : {}),
        }
      : undefined;

  const buildBody = (): GenerateRequestInput => ({
    type,
    level,
    topic: topic.trim() || undefined,
    count,
    dryRun,
    noRecent,
    customPrompt,
    savedPromptId: effectiveSavedId || undefined,
    professionSlug: profession || undefined,
  });

  const onGenerate = async () => {
    setLoading(true);
    onError(null);
    const res = await generateExercises(buildBody());
    setLoading(false);
    if (res.ok) onResult(res.result);
    else onError(res.code || "generic");
  };

  const openPreview = () => {
    setPreviewReq({
      type,
      level,
      topic: topic.trim() || undefined,
      customPrompt,
      savedPromptId: effectiveSavedId || undefined,
    });
    setPreviewOpen(true);
  };

  return (
    <Card padding="md" component="section">
      <Stack spacing={2}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField
            select
            label={t("type")}
            value={type}
            onChange={(e) => setType(e.target.value as ExType)}
            fullWidth
          >
            {EXERCISE_TYPES.map((ty) => (
              <MenuItem key={ty} value={ty}>
                {tTypes(ty)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={t("level")}
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            fullWidth
          >
            {GENERATOR_LEVELS.map((lv) => (
              <MenuItem key={lv} value={lv}>
                {lv}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            freeSolo
            options={topicsByLevel[level] ?? []}
            value={topic}
            onInputChange={(_e, v) => setTopic(v)}
            renderInput={(params) => (
              <TextField {...params} label={t("topic")} helperText={t("topicHelp")} />
            )}
          />

          <TextField
            type="number"
            label={t("count")}
            value={count}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              setCount(Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : 1);
            }}
            slotProps={{ htmlInput: { min: 1, max: 20 } }}
            fullWidth
          />

          <TextField
            select
            label={t("profession")}
            helperText={t("professionHelp")}
            value={profession}
            onChange={(e) => setProfession(e.target.value as ProfessionSlug | "")}
            fullWidth
          >
            <MenuItem value="">{t("professionNone")}</MenuItem>
            {PROFESSION_SLUGS.map((slug) => (
              <MenuItem key={slug} value={slug}>
                {tProfessions(slug)}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <TextField
          select
          label={t("savedPrompt")}
          value={effectiveSavedId}
          onChange={(e) => setSavedPromptId(e.target.value)}
          fullWidth
        >
          <MenuItem value="">{t("savedPromptNone")}</MenuItem>
          {promptsForType.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>

        <Accordion disableGutters sx={{ boxShadow: "none", border: 1, borderColor: "divider" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">{t("customPrompt")}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                label={t("systemOverride")}
                helperText={t("systemOverrideHelp")}
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
              <TextField
                label={t("instructionsOverride")}
                helperText={t("instructionsOverrideHelp")}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                multiline
                minRows={3}
                fullWidth
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        <FormGroup row sx={{ gap: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />}
            label={t("dryRun")}
          />
          <FormControlLabel
            control={<Checkbox checked={noRecent} onChange={(e) => setNoRecent(e.target.checked)} />}
            label={t("noRecent")}
          />
        </FormGroup>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={openPreview} disabled={loading} sx={{ minHeight: 44 }}>
            {t("preview")}
          </Button>
          <Button variant="outlined" onClick={() => setSaveOpen(true)} disabled={loading} sx={{ minHeight: 44 }}>
            {t("save")}
          </Button>
          <Button
            variant="contained"
            onClick={onGenerate}
            disabled={loading}
            sx={{ minHeight: 44, flex: { sm: 1 } }}
          >
            {loading ? t("generating") : t("generate")}
          </Button>
        </Stack>
      </Stack>

      <PreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} request={previewReq} />
      <SavePromptDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSaved={onPromptSaved}
        typeLocked
        initial={{
          type,
          systemPrompt: system.trim() ? system : null,
          userInstructions: instructions.trim() ? instructions : null,
        }}
      />
    </Card>
  );
}
