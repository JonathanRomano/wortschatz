"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

import type { CommentDTO } from "@/lib/comments/types";
import { CommentItem } from "./CommentItem";

type Props = {
  comments: CommentDTO[];
  isAuthed: boolean;
  hasMore: boolean;
  loading: boolean;
  onChange: (next: CommentDTO) => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
};

export function CommentList({
  comments,
  isAuthed,
  hasMore,
  loading,
  onChange,
  onDelete,
  onLoadMore,
}: Props) {
  const t = useTranslations("comments");

  if (comments.length === 0 && !loading) {
    return (
      <Box sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">{t("empty")}</Typography>
      </Box>
    );
  }

  return (
    <Stack>
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          isAuthed={isAuthed}
          onChange={onChange}
          onDelete={onDelete}
        />
      ))}
      {hasMore ? (
        <Box sx={{ pt: 2, textAlign: "center" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onLoadMore}
            disabled={loading}
          >
            {t("loadMore")}
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}
