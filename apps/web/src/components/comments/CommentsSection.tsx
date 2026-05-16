"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import type { CommentDTO, CommentListResponse } from "@/lib/comments/types";
import { CommentList } from "./CommentList";
import { CommentComposer } from "./CommentComposer";

type Props = {
  exerciseId: string;
  isAuthed: boolean;
  initial: CommentListResponse;
};

export function CommentsSection({ exerciseId, isAuthed, initial }: Props) {
  const t = useTranslations("comments");
  const [comments, setComments] = useState<CommentDTO[]>(initial.comments);
  const [page, setPage] = useState(initial.page);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [total, setTotal] = useState(initial.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreated = useCallback((created: CommentDTO) => {
    // New comments go to the top of the list optimistically. Server sort
    // is by like-count desc then date desc — for the first page that's
    // effectively the same as a "new on top" optimistic insert; a Load
    // More + refresh would re-stabilize the order if needed.
    setComments((prev) => [created, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  const handleChange = useCallback((next: CommentDTO) => {
    setComments((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    // Match the server's behavior: soft-delete removes the row from the
    // active list and decrements the visible total.
    setComments((prev) => prev.filter((c) => c.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  const loadMore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = page + 1;
      const res = await fetch(
        `/api/exercises/${exerciseId}/comments?page=${next}&pageSize=${initial.pageSize}`,
      );
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }
      const data = (await res.json()) as CommentListResponse;
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...data.comments.filter((c) => !seen.has(c.id))];
      });
      setPage(data.page);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }, [exerciseId, initial.pageSize, page, t]);

  return (
    <Accordion
      defaultExpanded={false}
      disableGutters
      elevation={0}
      sx={{
        backgroundColor: "transparent",
        border: 1,
        borderColor: "divider",
        borderStyle: "solid",
        borderRadius: 2,
        "&::before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 56,
          "& .MuiAccordionSummary-content": { my: 1 },
          transition: "background-color 200ms ease",
          "&:hover": {
            backgroundColor: "surfaceAlt.main",
          },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "baseline", flexWrap: "wrap" }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t("title")}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {t("count", { count: total })}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={2}>
          <CommentComposer
            exerciseId={exerciseId}
            isAuthed={isAuthed}
            onCreated={handleCreated}
          />
          <Divider />
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}
          <CommentList
            comments={comments}
            isAuthed={isAuthed}
            hasMore={hasMore}
            loading={loading}
            onChange={handleChange}
            onDelete={handleDelete}
            onLoadMore={loadMore}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
