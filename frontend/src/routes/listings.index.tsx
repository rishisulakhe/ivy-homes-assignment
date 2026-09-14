import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Home } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { PropertyCard } from "@/components/PropertyCard";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import { EmptyState } from "@/components/EmptyState";
import { FilterPanel, EMPTY_FILTERS, sortItems, type FilterState } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { fetchListings, fetchLocalities, PAGE_SIZE } from "@/lib/data";
import { effectiveAreaSqft } from "@/lib/quality";
import { formatNumber } from "@/lib/format";
import type { Listing, Locality } from "@/lib/types";

export const Route = createFileRoute("/listings/")({
  head: () => ({
    meta: [
      { title: "Buy homes in Mumbai — Ivy Homes" },
      {
        name: "description",
        content:
          "Search apartments, villas and penthouses for sale across Mumbai with honest data-quality flags.",
      },
      { property: "og:title", content: "Buy homes in Mumbai — Ivy Homes" },
      {
        property: "og:description",
        content: "Search apartments, villas and penthouses for sale across Mumbai.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ListingsPage />
    </RequireAuth>
  ),
});

function ListingsPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState("price_asc");
  const [items, setItems] = useState<Listing[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const reqId = useRef(0);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchLocalities()
      .then((d) => setLocalities(d.results ?? []))
      .catch(() => setLocalities([]));
  }, []);

  const serverFilters = useMemo(
    () => ({
      locality: filters.locality || undefined,
      bhk: filters.bhk ?? undefined,
      property_type: filters.property_type || undefined,
      furnishing: filters.furnishing || undefined,
      min_price: filters.min_price ? Number(filters.min_price) : undefined,
      max_price: filters.max_price ? Number(filters.max_price) : undefined,
    }),
    [filters],
  );

  const loadFirst = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    offsetRef.current = 0;
    try {
      const page = await fetchListings(0, serverFilters);
      if (id !== reqId.current) return;
      setItems(page.results);
      offsetRef.current = page.results.length;
      setHasMore(page.has_more && page.results.length > 0);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : "Could not load listings.");
      setItems([]);
      setHasMore(false);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [serverFilters]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    const id = reqId.current;
    setLoadingMore(true);
    try {
      const page = await fetchListings(offsetRef.current, serverFilters);
      if (id !== reqId.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.listing_id));
        return [...prev, ...page.results.filter((r) => !seen.has(r.listing_id))];
      });
      offsetRef.current += page.results.length;
      setHasMore(page.has_more && page.results.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, serverFilters]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const sorted = useMemo(() => sortItems(items, sort, (l) => effectiveAreaSqft(l)), [items, sort]);

  return (
    <div className="page-enter">
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 -z-10 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(1200px 400px at 15% -10%, oklch(0.93 0.05 130), transparent), radial-gradient(900px 380px at 90% 0%, oklch(0.94 0.04 85), transparent)",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Mumbai · residential sale
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight text-balance-tight sm:text-5xl">
            Find a home you'd actually live in.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Every listing is checked for duplicate records, bait pricing and broken source data
            before you see it.
          </p>

          <div className="mt-8">
            <FilterPanel
              value={filters}
              onChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
              localities={localities}
              sort={sort}
              onSortChange={setSort}
              resultLabel={
                loading ? "Loading homes…" : `Loaded ${formatNumber(sorted.length)} properties`
              }
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {loading ? (
          <SkeletonGrid count={6} />
        ) : error ? (
          <EmptyState
            title="We couldn't load listings"
            description={error}
            action={<Button onClick={() => void loadFirst()}>Try again</Button>}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            title="No homes match these filters"
            description="Try widening the price range or clearing the locality."
            action={<Button onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>}
            icon={<Home className="size-5" />}
          />
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              Showing 1–{formatNumber(sorted.length)} of the homes loaded so far
              {hasMore ? " · scroll for more" : " · end of results"}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((l, i) => (
                <PropertyCard key={l.listing_id} listing={l} index={i} />
              ))}
            </div>

            <div ref={sentinel} className="h-1" />

            <div className="mt-10 flex justify-center">
              {hasMore ? (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                  Load {PAGE_SIZE} more
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">You've reached the end.</p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
