type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { wrap: string; icon: number; label: string }> = {
  sm: { wrap: "px-2 py-0.5 text-xs gap-1", icon: 12, label: "text-xs" },
  md: { wrap: "px-2.5 py-1 text-sm gap-1.5", icon: 14, label: "text-sm" },
  lg: { wrap: "px-3.5 py-1.5 text-base gap-2", icon: 18, label: "text-base" },
};

export function MuenzenBadge({
  amount,
  size = "md",
  className = "",
  label,
}: {
  amount: number;
  size?: Size;
  className?: string;
  label?: string; // Optional aria-label override.
}) {
  const s = sizeMap[size];
  return (
    <span
      aria-label={label ?? `${amount} Münzen`}
      className={`inline-flex items-center rounded-full border border-accent/40 bg-accent-soft/60 font-medium tabular-nums text-accent-foreground ${s.wrap} ${className}`}
    >
      <CoinIcon size={s.icon} />
      <span className={s.label}>{amount.toLocaleString()}</span>
    </span>
  );
}

function CoinIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill="var(--accent)" stroke="var(--accent)" />
      <circle
        cx="12"
        cy="12"
        r="6"
        fill="none"
        stroke="var(--accent-foreground)"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fontFamily="ui-serif, Georgia, serif"
        fill="var(--accent-foreground)"
      >
        M
      </text>
    </svg>
  );
}
