interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div
      style={{
        width: '100%',
        height: 4,
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #0a6ed1, #6366f1)',
          borderRadius: 3,
          transition: 'width 0.15s ease',
        }}
      />
    </div>
  );
}
