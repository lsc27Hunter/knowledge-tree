interface MasteryBarProps {
  percentage: number;
}

export function MasteryBar({ percentage }: MasteryBarProps) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  const getColor = (percent: number): string => {
    if (percent >= 60) return "var(--color-success-green)";
    if (percent >= 40) return "var(--color-warning-yellow)";
    return "var(--color-danger-red)";
  };

  const color = getColor(clampedPercentage);

  return (
    <div>
      <div className="type-caption font-medium text-primary-light-grey">
        Mastery
      </div>
      <div className="mt-1 flex w-full items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${clampedPercentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <p className="min-w-10 text-right text-xs text-fg-subtle">
          {clampedPercentage}%
        </p>
      </div>
    </div>
  );
}
