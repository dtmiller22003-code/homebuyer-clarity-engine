interface BadgeProps {
  variant: "strong" | "moderate" | "weak" | "neutral" | "qm" | "nonqm";
  children: React.ReactNode;
  size?: "sm" | "md";
}

const variantClasses: Record<BadgeProps["variant"], string> = {
  strong: "bg-strong-bg text-strong-text border-strong-border",
  moderate: "bg-moderate-bg text-moderate-text border-moderate-border",
  weak: "bg-weak-bg text-weak-text border-weak-border",
  neutral: "bg-surface-100 text-surface-700 border-surface-300",
  qm: "bg-blue-50 text-blue-800 border-blue-200",
  nonqm: "bg-purple-50 text-purple-800 border-purple-200",
};

export function Badge({ variant, children, size = "md" }: BadgeProps) {
  const sizeClasses =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium border rounded-full whitespace-nowrap ${sizeClasses} ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
