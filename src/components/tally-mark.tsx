import { cn } from "./ui";

// Tally's mark: four strokes crossed by a fifth, the way you count by hand.
// Geometry from the brand files (596 x 596 artboard), so it sits in a tile
// exactly as designed. Three official colourings:
// - primary: light strokes, green slash, on the purple tile
// - dark: light strokes, pink slash, on the base (near-black) tile
// - inverted: base strokes, purple slash, on the light tile
const VARIANTS = {
  primary: { bars: "#F3F1FF", slash: "#2FD08F", tile: "#6F4FFF" },
  dark: { bars: "#F3F1FF", slash: "#FF5C9D", tile: "#0C0B1D" },
  inverted: { bars: "#0C0B1D", slash: "#6F4FFF", tile: "#F3F1FF" },
} as const;

export type TallyMarkVariant = keyof typeof VARIANTS;

const BARS = [194.5, 263.3, 332, 400.8];

export function TallyMark({
  variant = "primary",
  tile = false,
  className,
}: {
  variant?: TallyMarkVariant;
  // Draw the tile behind it too (otherwise the container supplies it)
  tile?: boolean;
  className?: string;
}) {
  const c = VARIANTS[variant];
  return (
    <svg viewBox="0 0 596 596" className={cn("shrink-0", className)} aria-hidden focusable="false">
      {tile ? <rect width="596" height="596" rx="132" fill={c.tile} /> : null}
      <g fill={c.bars}>
        {BARS.map((x) => (
          <rect key={x} x={x - 24.2} y={147.2} width={48.4} height={300.9} rx={24.2} />
        ))}
      </g>
      <line x1="132.3" y1="372.5" x2="463" y2="222.8" stroke={c.slash} strokeWidth="40.3" strokeLinecap="round" />
    </svg>
  );
}
