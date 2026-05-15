import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  // When true the card carries a subtle amber tint — used for "you'll like
  // this" or current-balance style highlight panels.
  accent?: boolean;
  // Tighter padding for dense grids; default fits a typical content card.
  padding?: "sm" | "md" | "lg";
};

const padMap = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({
  accent,
  padding = "md",
  className = "",
  ...rest
}: CardProps) {
  const tone = accent
    ? "border-accent/40 bg-accent-soft/40"
    : "border-border bg-surface";
  return (
    <div
      {...rest}
      className={`rounded-xl border shadow-sm ${tone} ${padMap[padding]} ${className}`}
    />
  );
}
