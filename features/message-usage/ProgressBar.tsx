interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <progress
      class="progress progress-primary mt-1.5 w-full"
      value={current}
      max={total > 0 ? total : 100}
    />
  );
}
