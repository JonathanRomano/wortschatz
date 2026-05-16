"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";

import { COMMENT_MAX_LENGTH } from "@wortschatz/config";
import type { CommentDTO } from "@/lib/comments/types";

type Props = {
  comment: CommentDTO;
  isAuthed: boolean;
  onChange: (next: CommentDTO) => void;
  onDelete: (id: string) => void;
};

function relativeFrom(now: number, isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const diff = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "now";
  if (diff < hour) return `${Math.floor(diff / minute)}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  return `${Math.floor(diff / day)}d`;
}

function mapErrorCode(code: string | undefined): string {
  switch (code) {
    case "too_long":
      return "errors.tooLong";
    case "blocked_word":
      return "errors.blocked";
    case "rate_limited":
      return "errors.rateLimited";
    case "forbidden":
    case "unauthorized":
      return "errors.notAllowed";
    default:
      return "errors.generic";
  }
}

export function CommentItem({ comment, isAuthed, onChange, onDelete }: Props) {
  const t = useTranslations("comments");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content ?? "");
  const [pulse, setPulse] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [likePending, startLikeTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  const now = Date.now();

  if (comment.deleted) {
    return (
      <Box
        sx={{
          py: 2,
          borderTop: 1,
          borderColor: "divider",
          color: "text.secondary",
          fontStyle: "italic",
        }}
      >
        <Typography variant="body2">{t("softDeleted")}</Typography>
      </Box>
    );
  }

  const absoluteDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(comment.createdAt));

  async function toggleLike() {
    if (!isAuthed) return;
    setErrorKey(null);
    startLikeTransition(async () => {
      try {
        const res = await fetch(`/api/comments/${comment.id}/like`, {
          method: "POST",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorKey(mapErrorCode(body.error));
          return;
        }
        const data = (await res.json()) as { liked: boolean; likeCount: number };
        onChange({
          ...comment,
          viewerLiked: data.liked,
          likeCount: data.likeCount,
        });
        setPulse(true);
        window.setTimeout(() => setPulse(false), 180);
      } catch {
        setErrorKey("errors.generic");
      }
    });
  }

  async function saveEdit() {
    setErrorKey(null);
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setErrorKey("errors.generic");
      return;
    }
    if (trimmed.length > COMMENT_MAX_LENGTH) {
      setErrorKey("errors.tooLong");
      return;
    }
    startSaveTransition(async () => {
      try {
        const res = await fetch(`/api/comments/${comment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorKey(mapErrorCode(body.error));
          return;
        }
        const next = (await res.json()) as CommentDTO;
        onChange(next);
        setEditing(false);
      } catch {
        setErrorKey("errors.generic");
      }
    });
  }

  async function performDelete() {
    if (!window.confirm(t("confirmDelete"))) return;
    setErrorKey(null);
    startDeleteTransition(async () => {
      try {
        const res = await fetch(`/api/comments/${comment.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorKey(mapErrorCode(body.error));
          return;
        }
        onDelete(comment.id);
      } catch {
        setErrorKey("errors.generic");
      }
    });
  }

  const remaining = COMMENT_MAX_LENGTH - draft.trim().length;

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        py: 2,
        borderTop: 1,
        borderColor: "divider",
        alignItems: "flex-start",
      }}
    >
      <Avatar
        src={comment.user?.avatarUrl ?? undefined}
        alt={comment.user?.name ?? ""}
        sx={{ width: 36, height: 36, flexShrink: 0 }}
      >
        {comment.user?.name?.[0]?.toUpperCase() ?? "?"}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {comment.user?.name ?? "—"}
          </Typography>
          <Tooltip title={absoluteDate}>
            <Typography
              component="span"
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              · {relativeFrom(now, comment.createdAt)}
            </Typography>
          </Tooltip>
          {comment.editedAt ? (
            <Typography
              component="span"
              variant="caption"
              sx={{ color: "text.secondary", fontStyle: "italic" }}
            >
              {t("editedTag")}
            </Typography>
          ) : null}
        </Stack>

        {editing ? (
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField
              multiline
              minRows={2}
              maxRows={8}
              fullWidth
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              slotProps={{
                htmlInput: { maxLength: COMMENT_MAX_LENGTH },
              }}
              disabled={savePending}
            />
            <Typography
              variant="caption"
              sx={{
                color: remaining < 0 ? "error.main" : "text.secondary",
                alignSelf: "flex-end",
              }}
            >
              {t("composer.charsLeft", { count: Math.max(0, remaining) })}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                onClick={saveEdit}
                disabled={savePending || draft.trim().length === 0}
              >
                {t("actions.save")}
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setEditing(false);
                  setDraft(comment.content ?? "");
                  setErrorKey(null);
                }}
                disabled={savePending}
              >
                {t("actions.cancel")}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {comment.content}
          </Typography>
        )}

        {errorKey ? (
          <Alert
            severity="error"
            sx={{ mt: 1 }}
            onClose={() => setErrorKey(null)}
          >
            {t(errorKey as Parameters<typeof t>[0])}
          </Alert>
        ) : null}

        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 0.5, alignItems: "center" }}
        >
          <Tooltip
            title={t(
              comment.viewerLiked ? "actions.unlike" : "actions.like",
            )}
          >
            <span>
              <IconButton
                size="small"
                onClick={toggleLike}
                disabled={!isAuthed || likePending}
                aria-label={t(
                  comment.viewerLiked ? "actions.unlike" : "actions.like",
                )}
                sx={{ color: comment.viewerLiked ? "secondary.main" : "inherit" }}
              >
                <Box
                  component="span"
                  className={pulse ? "liked" : ""}
                  sx={{
                    display: "inline-flex",
                    transition: "transform 150ms",
                    "&.liked": { transform: "scale(1.15)" },
                  }}
                >
                  {comment.viewerLiked ? (
                    <FavoriteIcon fontSize="small" />
                  ) : (
                    <FavoriteBorderIcon fontSize="small" />
                  )}
                </Box>
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {comment.likeCount}
          </Typography>

          {comment.isOwn && !editing ? (
            <Stack direction="row" spacing={0.25} sx={{ ml: 1 }}>
              <Tooltip title={t("actions.edit")}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditing(true);
                    setDraft(comment.content ?? "");
                  }}
                  aria-label={t("actions.edit")}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("actions.delete")}>
                <IconButton
                  size="small"
                  onClick={performDelete}
                  disabled={deletePending}
                  aria-label={t("actions.delete")}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}
