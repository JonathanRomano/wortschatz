type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { wrap: string; icon: number }> = {
  sm: { wrap: "px-2 py-0.5 text-xs gap-1", icon: 14 },
  md: { wrap: "px-2.5 py-1 text-sm gap-1.5", icon: 16 },
  lg: { wrap: "px-3.5 py-1.5 text-base gap-2", icon: 20 },
};

export function StreakFlame({
  days,
  size = "md",
  className = "",
  label,
}: {
  days: number;
  size?: Size;
  className?: string;
  label?: string;
}) {
  const s = sizeMap[size];
  const active = days > 0;
  return (
    <span
      aria-label={label ?? `${days} day streak`}
      className={`inline-flex items-center rounded-full font-medium tabular-nums ${s.wrap} ${
        active
          ? "border border-accent/40 bg-accent-soft/60 text-accent-foreground"
          : "border border-border bg-muted text-muted-foreground"
      } ${className}`}
    >
      <FlameIcon size={s.icon} active={active} />
      <span>{days}</span>
    </span>
  );
}

function FlameIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.5c1.5 3.2 4.5 5.4 4.5 9.2a4.5 4.5 0 1 1-9 0c0-1.6.6-2.6 1.5-3.5C8.5 11 9.5 13 12 13c0-2.2-1.5-5 0-10.5z"
        fill={active ? "var(--accent)" : "currentColor"}
        stroke={active ? "var(--accent-foreground)" : "currentColor"}
        strokeOpacity={active ? 0.25 : 0.6}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
