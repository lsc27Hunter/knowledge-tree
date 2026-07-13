interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = "" }: SpinnerProps) {
  return (
    <div
      className={`h-6 w-6 animate-spin rounded-full border-2 border-primary-light-grey/30 border-t-accent ${className}`}
      aria-label="Loading"
      role="status"
    />
  );
}
