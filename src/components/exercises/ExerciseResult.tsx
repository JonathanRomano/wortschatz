"use client";

import { useTranslations } from "next-intl";

import { MuenzenBadge } from "@/components/ui/MuenzenBadge";

type Props = {
  score: number;
  feedback: string;
  explanation: string;
  reward: number;
  streakBonus: number;
  alreadyEarned: boolean;
};

/**
 * Unified result panel shown after an exercise attempt. Shared between
 * the random-of-type runner and the single-exercise (retry) runner.
 */
export function ExerciseResult({
  score,
  feedback,
  explanation,
  reward,
  streakBonus,
  alreadyEarned,
}: Props) {
  const t = useTranslations("exercises");
  const passed = score >= 60;
  const totalReward = reward + streakBonus;

  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-sm ${
        passed ? "border-success/40 bg-success-soft/40" : "border-danger/40 bg-danger-soft/40"
      }`}
    >
      <div
        className={`flex items-center gap-4 px-5 py-4 sm:px-6 ${
          passed ? "bg-success/10" : "bg-danger/10"
        }`}
      >
        <ScoreRing score={score} passed={passed} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t("score")}
          </p>
          <p className="font-display text-2xl font-semibold sm:text-3xl">
            {score}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / 100
            </span>
          </p>
        </div>
        {totalReward > 0 ? (
          <MuenzenBadge amount={totalReward} size="lg" />
        ) : null}
      </div>

      <div className="space-y-3 bg-surface px-5 py-4 text-sm leading-relaxed sm:px-6 sm:text-base">
        <p>
          <span className="font-medium text-foreground">{t("feedback")}: </span>
          <span className="text-muted-foreground">{feedback}</span>
        </p>
        {explanation ? (
          <p>
            <span className="font-medium text-foreground">{t("explanation")}: </span>
            <span className="text-muted-foreground">{explanation}</span>
          </p>
        ) : null}
        {alreadyEarned ? (
          <p className="text-sm italic text-muted-foreground">
            {t("alreadyEarned")}
          </p>
        ) : totalReward > 0 ? (
          <p className="text-sm font-medium text-accent-foreground">
            {t("rewardEarned", { amount: totalReward })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="var(--surface)"
        stroke="var(--border)"
        strokeWidth="4"
      />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={passed ? "var(--success)" : "var(--danger)"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
      />
      <text
        x="28"
        y="32"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="var(--foreground)"
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        {score}
      </text>
    </svg>
  );
}
