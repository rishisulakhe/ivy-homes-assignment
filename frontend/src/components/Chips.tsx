import { AlertTriangle, BadgeCheck, Ruler, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveChip({ live }: { live?: boolean | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        live ? "bg-success/12 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", live ? "bg-success" : "bg-muted-foreground/60")}
      />
      {live ? "Live" : "Offline"}
    </span>
  );
}

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "brass" | "warning" | "destructive" | "primary";
  className?: string;
}) {
  const tones: Record<string, string> = {
    muted: "bg-secondary text-secondary-foreground",
    brass: "bg-brass/18 text-brass-foreground",
    warning: "bg-warning/18 text-warning-foreground",
    destructive: "bg-destructive/12 text-destructive",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BaitChip({ compact = false }: { compact?: boolean }) {
  return (
    <Chip tone="warning">
      <AlertTriangle className="size-3.5" strokeWidth={2} />
      {compact ? "Too good?" : "Price looks too good — possibly bait"}
    </Chip>
  );
}

export function SqmChip() {
  return (
    <Chip tone="primary">
      <Ruler className="size-3.5" strokeWidth={2} />
      Area unit corrected
    </Chip>
  );
}

export function CorruptChip({ compact = false }: { compact?: boolean }) {
  return (
    <Chip tone="destructive">
      <ShieldAlert className="size-3.5" strokeWidth={2} />
      {compact ? "Data issue" : "Flagged data issue"}
    </Chip>
  );
}

export function VerifiedChip() {
  return (
    <Chip tone="brass">
      <BadgeCheck className="size-3.5" strokeWidth={2} />
      Verified
    </Chip>
  );
}
