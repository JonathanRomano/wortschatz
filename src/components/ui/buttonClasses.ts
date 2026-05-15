export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:shadow",
  secondary:
    "bg-surface text-foreground border border-border shadow-sm hover:bg-muted hover:-translate-y-px",
  ghost:
    "text-foreground hover:bg-muted",
  danger:
    "bg-danger text-white shadow-sm hover:-translate-y-px hover:shadow",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-5 py-2.5 text-base",
  lg: "min-h-12 px-6 py-3 text-base sm:text-lg",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}
