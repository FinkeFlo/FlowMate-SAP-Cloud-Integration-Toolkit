interface FlowMateLogoProps {
  /** Rendered size in px; below 24 px the heavier small optical size is drawn. */
  size?: number;
}

/**
 * The FlowMate app icon (same drawing as public/icon.svg): an F drawn as an
 * integration route, the dot is the message. Colors come from the theme
 * (primary = petrol tile, primary-content = route, accent = spark).
 */
export function FlowMateLogo({ size = 24 }: FlowMateLogoProps) {
  const small = size < 24;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" class="shrink-0">
      <rect width="48" height="48" rx="11" class="fill-primary" />
      {small ? (
        <g transform="translate(24.6 24) scale(.92) translate(-24 -24)">
          <g fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="stroke-primary-content">
            <path d="M14 38V17a7 7 0 0 1 7-7h12" />
            <path d="M14 24h7" />
          </g>
          <circle cx="31.5" cy="24" r="5.5" class="fill-accent" />
        </g>
      ) : (
        <g transform="translate(24.4 24) scale(.84) translate(-24 -24)">
          <g fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" class="stroke-primary-content">
            <path d="M15 39V18a8 8 0 0 1 8-8h11" />
            <path d="M15 32a8 8 0 0 1 8-8h1" />
          </g>
          <circle cx="32.5" cy="24" r="4.5" class="fill-accent" />
        </g>
      )}
    </svg>
  );
}
