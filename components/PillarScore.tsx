import type { PillarScore as PillarScoreType } from "@/lib/types";

interface PillarScoreProps {
  label: string;
  score: PillarScoreType;
  headline?: string;
  compact?: boolean;
}

const dotColors: Record<PillarScoreType, string> = {
  strong: "bg-green-500",
  moderate: "bg-yellow-500",
  weak: "bg-red-500",
};

const labelText: Record<PillarScoreType, string> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
};

const bgShade: Record<PillarScoreType, string> = {
  strong: "bg-green-50 border-green-100",
  moderate: "bg-yellow-50 border-yellow-100",
  weak: "bg-red-50 border-red-100",
};

export function PillarScore({
  label,
  score,
  headline,
  compact,
}: PillarScoreProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotColors[score]}`} />
        <span className="text-xs text-surface-600">{label}</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${bgShade[score]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-surface-600">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dotColors[score]}`} />
          <span className="text-xs font-semibold text-surface-800">
            {labelText[score]}
          </span>
        </div>
      </div>
      {headline && (
        <p className="text-sm text-surface-800 leading-snug">{headline}</p>
      )}
    </div>
  );
}
