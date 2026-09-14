import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Hash,
  Layers,
  Loader2,
  MapPin,
  Maximize,
  ShieldCheck,
  Users,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { PropertyMedia } from "@/components/PropertyMedia";
import { PropertyCard } from "@/components/PropertyCard";
import { Chip } from "@/components/Chips";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllListings, fetchProject, readCachedDataset, writeCachedDataset } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { formatDate, formatINR, formatNumber, titleCase } from "@/lib/format";
import type { Listing, Project } from "@/lib/types";
import { MapPlaceholder } from "./listings.$id";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project detail — Ivy Homes Mumbai" },
      {
        name: "description",
        content: "Developer, RERA, price range and live listings for this Mumbai builder project.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProjectDetail />
    </RequireAuth>
  ),
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsProgress, setListingsProgress] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    setListings(null);

    const cached = readCachedDataset();
    const loadProject = fetchProject(id).catch((e) => {
      if (cancelled) return null;
      if (e instanceof ApiError && e.status === 404) setNotFound(true);
      else setError(e instanceof Error ? e.message : "Could not load this project.");
      return null;
    });

    async function loadListings() {
      // The API ignores a project_id filter, so the only way to count a
      // project's listings honestly is to group the full dataset client-side.
      const existing = readCachedDataset();
      if (existing) return existing.listings;
      setListingsLoading(true);
      try {
        const rows = await fetchAllListings((n) => !cancelled && setListingsProgress(n));
        writeCachedDataset(rows, []);
        return rows;
      } finally {
        if (!cancelled) setListingsLoading(false);
      }
    }

    Promise.all([loadProject, cached ? Promise.resolve(cached.listings) : loadListings()])
      .then(([p, all]) => {
        if (cancelled || !p) return;
        setProject(p);
        setListings(all.filter((l) => l.project_id === p.project_id));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-[300px] w-full rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || (!project && !error)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="This project doesn't exist"
          description={`We couldn't find project ${id}.`}
          action={
            <Button asChild>
              <Link to="/projects">Back to projects</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="Something went wrong" description={error ?? undefined} />
      </div>
    );
  }

  // Price fields are crores; some projects have min/max swapped in the source.
  const min = project.price_min !== undefined && project.price_min !== null ? project.price_min * 1e7 : null;
  const max = project.price_max !== undefined && project.price_max !== null ? project.price_max * 1e7 : null;
  const swapped = min !== null && max !== null && min > max;
  const lo = swapped ? max : min;
  const hi = swapped ? min : max;

  const liveCount = listings ? listings.filter((l) => l.is_live).length : null;
  const claimed = project.total_listings ?? null;
  const countMismatch =
    liveCount !== null && claimed !== null && listings !== null && claimed !== listings.length;

  return (
    <div className="page-enter mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/projects"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to projects
      </Link>

      <PropertyMedia seed={project.project_id} className="h-[300px] w-full rounded-3xl sm:h-[400px]">
        <div className="absolute left-6 top-6 flex flex-wrap gap-2">
          <Chip tone="primary">{titleCase(project.project_status)}</Chip>
          {swapped && <Chip tone="warning">Price range reversed in source</Chip>}
        </div>
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="font-display text-3xl font-semibold text-white drop-shadow sm:text-4xl">
            {titleCase(project.apartment_name)}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-white/90">
            <MapPin className="size-4" /> {titleCase(project.locality)}, Mumbai
          </p>
        </div>
      </PropertyMedia>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Price range</p>
            <p className="mt-1 font-display text-4xl font-semibold">
              {lo !== null ? formatINR(lo) : "—"}
              {hi !== null ? ` – ${formatINR(hi)}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Converted from {project.price_min ?? "—"}–{project.price_max ?? "—"} Cr as published by
              the source.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
              <Fact icon={<Building2 className="size-4" />} label="Developer" value={project.developer_name ?? "—"} />
              <Fact icon={<Users className="size-4" />} label="Total units" value={project.total_units !== undefined ? formatNumber(project.total_units) : "—"} />
              <Fact icon={<Layers className="size-4" />} label="Towers × floors" value={project.total_towers !== undefined && project.total_floors !== undefined ? `${project.total_towers} × ${project.total_floors}` : "—"} />
              <Fact
                icon={<Maximize className="size-4" />}
                label="Unit sizes"
                value={
                  project.min_area_sqft !== undefined
                    ? `${formatNumber(project.min_area_sqft)}–${formatNumber(project.max_area_sqft)} sqft`
                    : "—"
                }
              />
              <Fact icon={<CalendarDays className="size-4" />} label="Launched" value={formatDate(project.launch_date)} />
              <Fact icon={<CalendarDays className="size-4" />} label="Possession" value={formatDate(project.possession_date)} />
              <Fact icon={<Hash className="size-4" />} label="RERA" value={project.rera_number ?? "—"} />
              <Fact icon={<ShieldCheck className="size-4" />} label="Status" value={titleCase(project.project_status)} />
            </div>

            {project.amenities && project.amenities.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-6">
                {project.amenities.map((a) => (
                  <Chip key={a} tone="brass">
                    {titleCase(a)}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Location</h2>
            <MapPlaceholder lat={project.latitude} lng={project.longitude} label={titleCase(project.locality)} />
          </div>
        </div>

        <aside>
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Listings here</p>
            {listingsLoading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Grouping {formatNumber(listingsProgress)} records…
              </p>
            ) : listings !== null ? (
              <>
                <p className="mt-2 font-display text-4xl font-semibold">{listings.length}</p>
                {liveCount !== null && (
                  <p className="mt-1 text-sm text-muted-foreground">{liveCount} live right now</p>
                )}
                {countMismatch && (
                  <p className="mt-4 rounded-xl bg-warning/12 p-3 text-xs text-warning-foreground">
                    The project advertises {claimed} listings — the actual records in it are{" "}
                    {listings.length}. We show you what the data really says.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">—</p>
            )}
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                View on ivy.homes
              </a>
            )}
          </div>
        </aside>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold">Available listings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Grouped from the full listing set — the API's project filter is ignored server-side.
        </p>
        {listingsLoading ? (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading the listing catalogue to find this project's homes…
          </div>
        ) : !listings || listings.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No individual listings are currently tied to this project.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l, i) => (
              <PropertyCard key={l.listing_id} listing={l} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 max-w-[180px] truncate font-semibold" title={value}>
        {value}
      </p>
    </div>
  );
}
