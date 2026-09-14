import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Home, Loader2 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { RentalCard } from "@/components/RentalCard";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { EmptyState } from "@/components/EmptyState";
import { FilterPanel, EMPTY_FILTERS, type FilterState } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchAllRentals, fetchLocalities } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import type { Locality, Rental } from "@/lib/types";

export const Route = createFileRoute("/rentals/")({
  head: () => ({
    meta: [
      { title: "Homes for rent in Mumbai — Ivy Homes" },
      {
        name: "description",
        content:
          "Browse rental homes across Mumbai with honest rent, deposit and maintenance figures.",
      },
      { property: "og:title", content: "Homes for rent in Mumbai — Ivy Homes" },
      {
        property: "og:description",
        content:
          "Browse rental homes across Mumbai with honest rent, deposit and maintenance figures.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <RentalsPage />
    </RequireAuth>
  ),
});

const RENT_QUICK = [
  { label: "₹25k", value: 25000 },
  { label: "₹40k", value: 40000 },
  { label: "₹60k", value: 60000 },
  { label: "₹80k", value: 80000 },
];

let rentalsCache: Rental[] | null = null;

function RentalsPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState("price_asc");
  const [all, setAll] = useState<Rental[]>(rentalsCache ?? []);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(!rentalsCache);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocalities()
      .then((d) => setLocalities(d.results ?? []))
      .catch(() => setLocalities([]));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllRentals((n) => setProgress(n));
      rentalsCache = rows;
      setAll(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load rentals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!rentalsCache) void loadAll();
  }, [loadAll]);

  // All filtering is client-side: the API ignores rent bounds, and sorting the
  // full set here means every sort option is exact.
  const filtered = useMemo(() => {
    if (!all) return [];
    const min = filters.min_price ? Number(filters.min_price) : null;
    const max = filters.max_price ? Number(filters.max_price) : null;
    const rows = all.filter((r) => {
      if (filters.locality && r.locality !== filters.locality) return false;
      if (filters.bhk !== null && r.bedroom !== filters.bhk) return false;
      if (filters.furnishing && r.furnishing !== filters.furnishing) return false;
      if (min !== null && r.price < min) return false;
      if (max !== null && r.price > max) return false;
      return true;
    });
    const arr = [...rows];
    switch (sort) {
      case "price_asc":
        return arr.sort((a, b) => a.price - b.price);
      case "price_desc":
        return arr.sort((a, b) => b.price - a.price);
      case "area_desc":
        return arr.sort((a, b) => (b.carpet_area ?? 0) - (a.carpet_area ?? 0));
      case "area_asc":
        return arr.sort((a, b) => (a.carpet_area ?? 0) - (b.carpet_area ?? 0));
      case "bedroom_desc":
        return arr.sort((a, b) => b.bedroom - a.bedroom);
      case "newest":
        return arr.sort(
          (a, b) => new Date(b.posted_at ?? 0).getTime() - new Date(a.posted_at ?? 0).getTime(),
        );
      default:
        return arr;
    }
  }, [all, filters, sort]);

  return (
    <div className="page-enter">
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 -z-10 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(1200px 400px at 85% -10%, oklch(0.93 0.05 210), transparent), radial-gradient(900px 380px at 10% 0%, oklch(0.94 0.04 160), transparent)",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Mumbai · homes for rent
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight text-balance-tight sm:text-5xl">
            Rent first, decide later.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Monthly rent, deposit and maintenance shown exactly as listed — no hidden numbers.
          </p>

          <div className="mt-8">
            <FilterPanel
              value={filters}
              onChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
              localities={localities}
              showPropertyType={false}
              priceLabel="Monthly rent (₹)"
              quickPrices={RENT_QUICK}
              priceNote="Rent bounds are applied locally — the API silently ignores them."
              sort={sort}
              onSortChange={setSort}
              resultLabel={
                loading
                  ? "Loading all rentals…"
                  : `${formatNumber(filtered.length)} of ${formatNumber(all?.length ?? 0)} homes`
              }
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Pulling the full rental list so every filter is exact…
              <span className="font-medium text-foreground">{formatNumber(progress)} loaded</span>
            </div>
            <Progress value={Math.min(100, (progress / 2100) * 100)} className="h-1.5" />
            <SkeletonGrid count={6} />
          </div>
        ) : error ? (
          <EmptyState
            title="We couldn't load rentals"
            description={error}
            action={<Button onClick={() => void loadAll()}>Try again</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No rentals match these filters"
            description="Try widening the rent range or clearing the locality."
            action={<Button onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>}
            icon={<Home className="size-5" />}
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              Showing all {formatNumber(filtered.length)} matching homes
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r, i) => (
                <RentalCard key={r.listing_id} rental={r} index={i} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
