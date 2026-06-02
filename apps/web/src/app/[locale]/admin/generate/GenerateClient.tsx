"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";

import { listSavedPrompts, type SavedPromptDTO } from "@/lib/admin/client";
import { GENERATOR_LEVELS } from "@/lib/admin/schemas";
import type { GenerationResult } from "@scripts/shared/types";

import { GenerateForm } from "./GenerateForm";
import { ResultsPanel } from "./ResultsPanel";

type Level = (typeof GENERATOR_LEVELS)[number];

/**
 * Generate-page client root. Owns the result/loading/error state and the
 * saved-prompt list, laid out as form (left) + results (right) on desktop
 * and stacked below 900px.
 */
export function GenerateClient({
  topicsByLevel,
}: {
  topicsByLevel: Record<Level, string[]>;
}) {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<SavedPromptDTO[]>([]);

  useEffect(() => {
    listSavedPrompts().then((r) => {
      if (r.ok) setSavedPrompts(r.prompts);
    });
  }, []);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" },
        gap: 3,
        alignItems: "start",
      }}
    >
      <GenerateForm
        topicsByLevel={topicsByLevel}
        savedPrompts={savedPrompts}
        loading={loading}
        setLoading={setLoading}
        onResult={(r) => {
          setResult(r);
          setErrorCode(null);
        }}
        onError={setErrorCode}
        onPromptSaved={(p) =>
          setSavedPrompts((prev) => [p, ...prev.filter((x) => x.id !== p.id)])
        }
      />
      <ResultsPanel result={result} loading={loading} errorCode={errorCode} />
    </Box>
  );
}
