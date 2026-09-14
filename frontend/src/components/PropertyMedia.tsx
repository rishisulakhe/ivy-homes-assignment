import { cn } from "@/lib/utils";

/** Deterministic gradient/pattern artwork used in place of photography. */
function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PALETTES = [
  ["oklch(0.42 0.07 156)", "oklch(0.72 0.08 130)"],
  ["oklch(0.38 0.06 210)", "oklch(0.74 0.07 190)"],
  ["oklch(0.45 0.09 60)", "oklch(0.82 0.08 85)"],
  ["oklch(0.36 0.07 300)", "oklch(0.72 0.07 330)"],
  ["oklch(0.4 0.08 25)", "oklch(0.78 0.08 55)"],
  ["oklch(0.33 0.05 155)", "oklch(0.68 0.06 110)"],
];

export function PropertyMedia({
  seed,
  className,
  children,
}: {
  seed: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const h = hash(seed);
  const pair = PALETTES[h % PALETTES.length] ?? PALETTES[0]!;
  const angle = 120 + (h % 90);
  const dot = (h >> 3) % 3;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundImage: `linear-gradient(${angle}deg, ${pair[0]}, ${pair[1]})` }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            dot === 0
              ? "radial-gradient(circle at 1px 1px, rgba(255,255,255,.55) 1px, transparent 0)"
              : dot === 1
                ? "repeating-linear-gradient(135deg, rgba(255,255,255,.25) 0 1px, transparent 1px 14px)"
                : "repeating-linear-gradient(0deg, rgba(255,255,255,.2) 0 1px, transparent 1px 18px)",
          backgroundSize: dot === 0 ? "18px 18px" : undefined,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,.42) 0%, rgba(0,0,0,.08) 45%, rgba(0,0,0,0) 100%)",
        }}
      />
      <svg
        className="absolute bottom-0 left-0 h-2/3 w-full opacity-35"
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
      >
        <g fill="rgba(255,255,255,.5)">
          <rect x="16" y="70" width="56" height="90" />
          <rect x="84" y="40" width="44" height="120" />
          <rect x="140" y="86" width="70" height="74" />
          <rect x="222" y="24" width="50" height="136" />
          <rect x="284" y="62" width="40" height="98" />
          <rect x="334" y="96" width="54" height="64" />
        </g>
      </svg>
      {children ? <div className="relative h-full w-full">{children}</div> : null}
    </div>
  );
}
