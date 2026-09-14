import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Copy,
  Database,
  Eye,
  EyeOff,
  Heart,
  Home,
  Loader2,
  Ruler,
  ShieldAlert,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchAllListings, fetchAllProjects, readCachedDataset, writeCachedDataset } from "@/lib/data";
import {
  countBy,
  localityStats,
  medianPriceByBhk,
  psfHistogram,
  qualitySummary,
} from "@/lib/insights";
import { formatINR, formatNumber, titleCase } from "@/lib/format";
import type { Listing, Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights/")({
  head: () => ({
    meta: [
      { title: "Insights — Ivy Homes Mumbai" },
      {
        name: "description",
        content:
          "Market dashboard and data-quality radar computed from every retrievable Mumbai listing.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <InsightsPage />
    </RequireAuth>
  ),
});

const CHART_COLORS = [
  "oklch(0.42 0.08 156)",
  "oklch(0.68 0.1 80)",
  "oklch(0.6 0.09 215)",
  "oklch(0.62 0.14 35)",
  "oklch(0.55 0.1 300)",
];

function InsightsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const cached = readCachedDataset();
    if (cached) {
      setListings(cached.listings);
      setFromCache(true);
      // Projects may be missing from an older cache; top up quietly.
      setProjects(
        cached.projects.length ? cached.projects : await fetchAllProjects().catch(() => []),
      );
      setLoading(false);
      return;
    }
    try {
      const rows = await fetchAllListings((n) => setProgress(n));
      const projs = await fetchAllProjects();
      writeCachedDataset(rows, projs);
      setListings(rows);
      setProjects(projs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the dataset.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => qualitySummary(listings, projects), [listings, projects]);
  const byLocality = useMemo(() => localityStats(listings), [listings]);
  const byBedroom = useMemo(() => countBy(listings, (l) => (l.bedroom === 0 ? "Plot" : `${l.bedroom} BHK`)), [listings]);
  const medianByBhk = useMemo(() => medianPriceByBhk(listings), [listings]);
  const psf = useMemo(() => psfHistogram(listings), [listings]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
          <h1 className="mt-6 font-display text-3xl font-semibold">Building your insights</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pulling every retrievable listing and project — the API has no analytics endpoint, so we
            compute everything honestly on the full dataset.
          </p>
          <div className="mt-8">
            <Progress value={Math.min(100, (progress / 5100) * 100)} className="h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              {formatNumber(progress)} records loaded
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Couldn't build insights</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-6" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <section className="border-b border-border bg-gradient-to-b from-secondary/70 to-background">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Mumbai · market insights
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            What 5,100 records actually say.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            The promised <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">/v1/analytics/summary</code>{" "}
            endpoint doesn't exist, so every number here is computed locally from the complete
            dataset — with unit errors corrected and bait excluded where it would mislead.
            {fromCache && " Served from your local cache; refetch happens automatically after 6 hours."}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi icon={<Database className="size-4" />} label="Records retrieved" value={formatNumber(stats.records)} />
            <Kpi icon={<Home className="size-4" />} label="Distinct homes" value={formatNumber(stats.uniqueHomes)} hint={`${formatNumber(stats.duplicateRecords)} duplicate records collapsed`} />
            <Kpi icon={<Eye className="size-4" />} label="Live now" value={formatNumber(stats.liveCount)} hint={`${formatNumber(stats.offlineCount)} offline`} />
            <Kpi icon={<ShieldAlert className="size-4" />} label="Flagged records" value={formatNumber(stats.corruptCount + stats.baitCount)} hint={`${stats.corruptCount} corrupt · ${stats.baitCount} bait`} tone="warn" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Homes by locality" subtitle="Every retrievable record, grouped by area">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byLocality} margin={{ top: 8, right: 8, left: -18, bottom: 38 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.012 110)" />
                <XAxis
                  dataKey="locality"
                  tickFormatter={(v: string) => titleCase(v)}
                  angle={-32}
                  textAnchor="end"
                  height={56}
                  tick={{ fontSize: 11, fill: "oklch(0.52 0.022 150)" }}
                />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.022 150)" }} />
                <Tooltip
                  formatter={(v: number) => [`${formatNumber(v)} records`, "Listings"]}
                  labelFormatter={(l: string) => titleCase(l)}
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.9 0.012 110)" }}
                />
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Configuration mix" subtitle="Bedroom distribution across the city">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={byBedroom}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {byBedroom.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  formatter={(v: number) => [`${formatNumber(v)} records`, "Listings"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.9 0.012 110)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Median price by configuration" subtitle="Corrupt prices (₹0/negative) excluded">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={medianByBhk} margin={{ top: 8, right: 8, left: -6, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.012 110)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.52 0.022 150)" }} />
                <YAxis
                  tickFormatter={(v: number) => `₹${Math.round(v / 1e7)}Cr`}
                  tick={{ fontSize: 11, fill: "oklch(0.52 0.022 150)" }}
                />
                <Tooltip
                  formatter={(v: number) => [formatINR(v), "Median price"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.9 0.012 110)" }}
                />
                <Bar dataKey="count" name="Median price" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="₹ per sqft distribution"
            subtitle="Square-metre records corrected — the honest market band is ₹11k–51k"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={psf} margin={{ top: 8, right: 8, left: -18, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.012 110)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "oklch(0.52 0.022 150)" }} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.022 150)" }} />
                <Tooltip
                  formatter={(v: number) => [`${formatNumber(v)} homes`, "₹/sqft band"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.9 0.012 110)" }}
                />
                <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-warning/18 text-warning-foreground">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold">Data quality radar</h2>
              <p className="text-sm text-muted-foreground">
                Everything we found wrong with this feed, made visible.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <QualityPanel
              icon={<Copy className="size-4" />}
              tone="primary"
              title={`${formatNumber(stats.duplicateRecords)} records are re-listings`}
              body={
                <>
                  {formatNumber(stats.records)} records describe{" "}
                  {formatNumber(stats.uniqueHomes)} distinct homes. The same flat appears on
                  multiple portals with jittered prices, areas and coordinates — counts and
                  "homes for sale" widgets that trust the raw feed overstate supply by{" "}
                  {Math.round((stats.duplicateRecords / stats.records) * 100)}%.
                </>
              }
            />

            <QualityPanel
              icon={<EyeOff className="size-4" />}
              tone="muted"
              title={`${formatNumber(stats.offlineCount)} listings are not live`}
              body={
                <>
                  The documentation claims inactive listings are excluded server-side. They aren't:
                  {Math.round((stats.offlineCount / stats.records) * 100)}% of the feed is offline.
                  Every card in this app carries a live/offline badge.
                </>
              }
            />

            <QualityPanel
              icon={<Ruler className="size-4" />}
              tone="primary"
              title={`${formatNumber(stats.sqmCount)} listings are labelled in the wrong unit`}
              body={
                <>
                  One portal reports carpet areas in square metres while every other field claims
                  square feet. Read as-is they price at ₹{formatNumber(stats.sqmMedianPsfRaw)}/sqft;
                  converted (×10.7639) they land at ₹
                  {formatNumber(stats.sqmMedianPsfCorrected)}/sqft — squarely in the market band.
                  We display corrected areas on every affected home.
                </>
              }
            />

            <QualityPanel
              icon={<Heart className="size-4" />}
              tone="warn"
              title={`${stats.baitCount} listings are enquiry bait`}
              body={
                <>
                  Five agent phone numbers — each attached to exactly 38 listings — post homes at
                  25–60% below the local market with "urgent sale" copy. Roughly a third are
                  half-priced clones of specific genuine listings.
                  <ul className="mt-3 space-y-1 font-mono text-xs">
                    {stats.baitNumbers.map((b) => (
                      <li key={b.number} className="flex justify-between gap-4">
                        <span>{b.number}</span>
                        <span className="text-muted-foreground">{b.count} listings</span>
                      </li>
                    ))}
                  </ul>
                </>
              }
            />

            <QualityPanel
              icon={<ShieldAlert className="size-4" />}
              tone="destructive"
              title={`${stats.corruptCount} records describe impossible homes`}
              body={
                <>
                  <ul className="space-y-1">
                    {stats.corruptByReason.map((r) => (
                      <li key={r.name} className="flex justify-between gap-4">
                        <span>{r.name}</span>
                        <span className="text-muted-foreground">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Samples: {stats.corruptSamples.slice(0, 5).map((s) => s.id).join(", ")}
                  </p>
                </>
              }
            />

            <QualityPanel
              icon={<Building2 className="size-4" />}
              tone="warn"
              title={`${stats.wrongCountProjects} of ${stats.totalProjects} projects misreport their listing count`}
              body={
                <>
                  Project pages advertise a{" "}
                  <code className="rounded bg-secondary px-1 py-0.5 text-xs">total_listings</code>{" "}
                  figure that matches reality for barely two-thirds of projects.{" "}
                  {stats.reversedPriceProjects.length} projects even have min above max price. This
                  app always shows the counted truth.
                  {stats.reversedPriceProjects.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Reversed price ranges: {stats.reversedPriceProjects.slice(0, 6).join(", ")}
                    </p>
                  )}
                </>
              }
            />
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/listings">
                Browse with flags <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/projects">
                <Building2 className="size-4" /> Check project counts
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-card",
        tone === "warn" ? "border-warning/40" : "border-border",
      )}
    >
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}

function QualityPanel({
  icon,
  title,
  body,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  tone: "primary" | "warn" | "destructive" | "muted";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    warn: "bg-warning/18 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-secondary text-muted-foreground",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tones[tone])}>
          {icon}
        </span>
        <h3 className="font-semibold leading-snug">{title}</h3>
      </div>
      <div className="mt-4 text-sm leading-relaxed text-muted-foreground">{body}</div>
    </div>
  );
}
