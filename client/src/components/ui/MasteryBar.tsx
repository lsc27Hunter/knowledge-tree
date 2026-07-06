interface MasteryBarProps {
  percentage: number;
}

export function MasteryBar({ percentage }: MasteryBarProps) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  const getColor = (percent: number): string => {
    if (percent >= 60) return "var(--color-success-green)";
    if (percent >= 40) return "var(--color-warning-yellow)";
    if (percent >= 20) return "var(--color-danger-red)";
    return "var(--color-danger-red)";
  };

  const color = getColor(clampedPercentage);

  return (
    <div>
      <div className="text-xsmall text-primary-light-grey font-medium">
        Mastery
      </div>
      <div className="flex w-full items-center gap-2">
        <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out "
            style={{
              width: `${clampedPercentage}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <p className="min-w-10 text-right text-xs text-gray-600">
          {clampedPercentage}%
        </p>
      </div>
    </div>
  );
}
