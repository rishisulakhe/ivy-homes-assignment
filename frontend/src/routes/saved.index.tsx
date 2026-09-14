import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Home } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { PropertyCard } from "@/components/PropertyCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/lib/saved";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/saved/")({
  head: () => ({
    meta: [
      { title: "Saved homes — Ivy Homes" },
      {
        name: "description",
        content: "Your shortlisted Mumbai homes, saved per account and kept across sessions.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SavedPage />
    </RequireAuth>
  ),
});

function SavedPage() {
  const { items, loading, refresh } = useSaved();

  return (
    <div className="page-enter mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Your shortlist</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">
            {loading ? "Saved homes" : `${formatNumber(items.length)} saved ${items.length === 1 ? "home" : "homes"}`}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Shortlists are saved against your account and stay put across reloads and sign-ins.
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={() => void refresh()}>
            Refresh
          </Button>
        )}
      </div>

      <div className="mt-10">
        {loading ? (
          <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Loading your shortlist…
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            description="Tap the heart on any property to add it to your shortlist."
            icon={<Heart className="size-5" />}
            action={
              <Button asChild>
                <Link to="/listings">
                  <Home className="size-4" /> Browse homes
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l, i) => (
              <PropertyCard key={l.listing_id} listing={l} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
