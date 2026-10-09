import type { ComponentChildren } from 'preact';

interface EmptyStateProps {
  /** What is empty, e.g. "No messages found". */
  title: string;
  /** Optional sentence or a single soft action below the title. */
  children?: ComponentChildren;
}

/**
 * Empty state: the logo's route drawn in hairlines, with a dashed empty stop
 * where the message (the spark) would be — nothing has travelled here yet.
 */
export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div class="flex flex-col items-center gap-1.5 px-4 py-8 text-center text-xs text-muted">
      <svg viewBox="8 4 34 40" width="30" height="35" aria-hidden="true" class="mb-1">
        <g fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="stroke-base-300">
          <path d="M15 39V18a8 8 0 0 1 8-8h11" />
          <path d="M15 32a8 8 0 0 1 8-8h1" />
        </g>
        <circle cx="32.5" cy="24" r="4" fill="none" stroke-width="2" stroke-dasharray="3 3" class="stroke-border" />
      </svg>
      <span class="text-sm font-semibold text-base-content">{title}</span>
      {children}
    </div>
  );
}
