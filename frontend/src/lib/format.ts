export function formatINR(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const neg = value < 0;
  const v = Math.abs(value);
  let out: string;
  if (v >= 1e7) {
    const cr = v / 1e7;
    out = `₹${trim(cr)} Cr`;
  } else if (v >= 1e5) {
    const l = v / 1e5;
    out = `₹${trim(l)} L`;
  } else {
    out = `₹${groupIndian(Math.round(v))}`;
  }
  return neg ? `-${out}` : out;
}

export function formatINRFull(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const neg = value < 0;
  return `${neg ? "-" : ""}₹${groupIndian(Math.round(Math.abs(value)))}`;
}

function trim(n: number) {
  const s = n.toFixed(2);
  return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function groupIndian(n: number): string {
  const s = String(n);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return groupIndian(Math.round(n));
}

export function titleCase(s: string | undefined | null): string {
  if (!s) return "—";
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatPhone(p?: string | null): string {
  if (!p) return "—";
  const digits = p.replace(/\D/g, "");
  if (digits.length >= 12) {
    const cc = digits.slice(0, 2);
    const rest = digits.slice(2);
    return `+${cc} ${rest.slice(0, 5)} ${rest.slice(5)}`;
  }
  return p;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function relativeDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = Date.now() - d;
  if (diff < 0) return "future-dated";
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export const SQM_TO_SQFT = 10.7639;
