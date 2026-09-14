import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { ProjectCard } from "@/components/ProjectCard";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAllProjects, fetchLocalities } from "@/lib/data";
import { formatNumber, titleCase } from "@/lib/format";
import type { Locality, Project } from "@/lib/types";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "New projects in Mumbai — Ivy Homes" },
      {
        name: "description",
        content:
          "Builder projects across Mumbai with RERA numbers, unit mixes and price ranges in rupees.",
      },
      { property: "og:title", content: "New projects in Mumbai — Ivy Homes" },
      {
        property: "og:description",
        content: "Builder projects across Mumbai with RERA numbers and price ranges in rupees.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProjectsPage />
    </RequireAuth>
  ),
});

type ProjectSort = "price_desc" | "price_asc" | "units_desc" | "name_asc";

let projectsCache: Project[] | null = null;

function ProjectsPage() {
  const [all, setAll] = useState<Project[]>(projectsCache ?? []);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(!projectsCache);
  const [error, setError] = useState<string | null>(null);
  const [locality, setLocality] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<ProjectSort>("price_desc");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllProjects();
      projectsCache = rows;
      setAll(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!projectsCache) void load();
    fetchLocalities()
      .then((d) => setLocalities(d.results ?? []))
      .catch(() => setLocalities([]));
  }, [load]);

  const statuses = useMemo(
    () => Array.from(new Set(all.map((p) => p.project_status).filter(Boolean))).sort(),
    [all],
  );

  // The API can't filter or sort projects meaningfully (order is ignored), so
  // everything is computed on the full 590-project set.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = all.filter((p) => {
      if (locality !== "all" && p.locality !== locality) return false;
      if (status !== "all" && p.project_status !== status) return false;
      if (q && !`${p.apartment_name} ${p.developer_name ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const priceMaxOf = (p: Project) => (p.price_max ?? 0) * 1e7;
    const arr = [...rows];
    switch (sort) {
      case "price_desc":
        return arr.sort((a, b) => priceMaxOf(b) - priceMaxOf(a));
      case "price_asc":
        return arr.sort((a, b) => priceMaxOf(a) - priceMaxOf(b));
      case "units_desc":
        return arr.sort((a, b) => (b.total_units ?? 0) - (a.total_units ?? 0));
      case "name_asc":
        return arr.sort((a, b) => a.apartment_name.localeCompare(b.apartment_name));
      default:
        return arr;
    }
  }, [all, locality, status, search, sort]);

  return (
    <div className="page-enter">
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 -z-10 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(1200px 400px at 50% -10%, oklch(0.93 0.05 300), transparent), radial-gradient(900px 380px at 90% 0%, oklch(0.94 0.04 160), transparent)",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Mumbai · builder projects
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight text-balance-tight sm:text-5xl">
            Buy into something brand new.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Every project's price range converted from crores to rupees, with RERA numbers shown
            where the builder published one.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 grid gap-5 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Search</Label>
            <Input
              placeholder="Project or developer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Locality</Label>
            <Select value={locality} onValueChange={setLocality}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All localities</SelectItem>
                {localities.map((l) => (
                  <SelectItem key={l.locality} value={l.locality}>
                    {titleCase(l.locality)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {titleCase(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sort by</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as ProjectSort)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_desc">Highest price</SelectItem>
                <SelectItem value="price_asc">Lowest price</SelectItem>
                <SelectItem value="units_desc">Most units</SelectItem>
                <SelectItem value="name_asc">Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading all {formatNumber(all.length || 590)} projects…
            </div>
            <SkeletonGrid count={6} />
          </div>
        ) : error ? (
          <EmptyState
            title="We couldn't load projects"
            description={error}
            action={<Button onClick={() => void load()}>Try again</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No projects match"
            description="Try clearing the search or locality filters."
            action={
              <Button
                onClick={() => {
                  setSearch("");
                  setLocality("all");
                  setStatus("all");
                }}
              >
                Clear filters
              </Button>
            }
            icon={<Building2 className="size-5" />}
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              Showing {formatNumber(filtered.length)} of {formatNumber(all.length)} projects · price
              ranges converted from crores
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, i) => (
                <ProjectCard key={p.project_id} project={p} index={i} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
