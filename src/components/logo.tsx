import { LOGO_DOTS, LOGO_DOT_RADIUS, LOGO_VIEWBOX } from "@/config/logo";

/**
 * The Loopback mark, drawn in the text colour so it follows the theme.
 * Decorative: the name next to it carries the meaning.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {LOGO_DOTS.map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={LOGO_DOT_RADIUS} />
      ))}
    </svg>
  );
}
