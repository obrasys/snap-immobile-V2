export function SnapLogo({
  size = "md",
  variant = "color",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  variant?: "color" | "white";
  className?: string;
}) {
  const px = size === "sm" ? 52 : size === "lg" ? 124 : 84;

  const purple = "hsl(var(--brand))";
  const orange = "hsl(var(--cta))";
  const white = "#FFFFFF";

  const snapFill = variant === "white" ? white : purple;
  const cornersFill = variant === "white" ? white : purple;
  const immobileFill = variant === "white" ? white : orange;

  return (
    <div className={className} aria-label="Snap Immobile">
      <svg
        width={px}
        height={px}
        viewBox="0 0 512 512"
        role="img"
        aria-hidden="true"
      >
        {/* Corners (L-shapes) */}
        <rect x="64" y="64" width="192" height="84" rx="40" fill={cornersFill} />
        <rect x="64" y="64" width="84" height="192" rx="40" fill={cornersFill} />

        <rect x="256" y="64" width="192" height="84" rx="40" fill={cornersFill} />
        <rect x="364" y="64" width="84" height="192" rx="40" fill={cornersFill} />

        <rect x="64" y="364" width="192" height="84" rx="40" fill={cornersFill} />
        <rect x="64" y="256" width="84" height="192" rx="40" fill={cornersFill} />

        <rect x="256" y="364" width="192" height="84" rx="40" fill={cornersFill} />
        <rect x="364" y="256" width="84" height="192" rx="40" fill={cornersFill} />

        {/* Wordmark */}
        <text
          x="256"
          y="298"
          textAnchor="middle"
          fontFamily="Red Hat Display, ui-sans-serif, system-ui"
          fontWeight="900"
          fontSize="182"
          fill={snapFill}
          letterSpacing="-6"
        >
          snap
        </text>
        <text
          x="256"
          y="392"
          textAnchor="middle"
          fontFamily="Red Hat Display, ui-sans-serif, system-ui"
          fontWeight="900"
          fontSize="88"
          fill={immobileFill}
          letterSpacing="-2"
        >
          immobile
        </text>
      </svg>
    </div>
  );
}