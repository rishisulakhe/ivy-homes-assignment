import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Compass,
  Heart,
  Layers,
  MapPin,
  Maximize,
  Car,
  Phone,
  User,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { PropertyMedia } from "@/components/PropertyMedia";
import { PropertyCard } from "@/components/PropertyCard";
import { BaitChip, Chip, CorruptChip, LiveChip, SqmChip, VerifiedChip } from "@/components/Chips";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchListing, fetchListings } from "@/lib/data";
import { ApiError } from "@/lib/api";
import {
  formatDate,
  formatINR,
  formatINRFull,
  formatNumber,
  formatPhone,
  SQM_TO_SQFT,
  titleCase,
} from "@/lib/format";
import { effectiveAreaSqft, flagsFor } from "@/lib/quality";
import { useSaved } from "@/lib/saved";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/listings/$id")({
  head: () => ({
    meta: [
      { title: "Property detail — Ivy Homes Mumbai" },
      {
        name: "description",
        content:
          "Full details, pricing, seller information and similar homes for this Mumbai property.",
      },
      { property: "og:title", content: "Property detail — Ivy Homes Mumbai" },
      {
        property: "og:description",
        content: "Full details, pricing and similar homes for this Mumbai property.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ListingDetail />
    </RequireAuth>
  ),
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { isSaved, toggle } = useSaved();
  const [listing, setListing] = useState<Listing | null>(null);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    setSimilar([]);
    fetchListing(id)
      .then((l) => {
        if (cancelled) return;
        setListing(l);
        return fetchListings(0, { locality: l.locality, bhk: l.bedroom }, 50).then((page) => {
          if (cancelled) return;
          const lo = l.price * 0.85;
          const hi = l.price * 1.15;
          setSimilar(
            page.results
              .filter(
                (r) =>
                  r.listing_id !== l.listing_id && r.price >= lo && r.price <= hi && r.price > 0,
              )
              .slice(0, 6),
          );
        });
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e instanceof Error ? e.message : "Could not load this property.");
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
        <Skeleton className="h-[320px] w-full rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || (!listing && !error)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="This property no longer exists"
          description={`We couldn't find listing ${id}. It may have been removed by the source portal.`}
          action={
            <Button asChild>
              <Link to="/listings">Back to search</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="Something went wrong" description={error ?? undefined} />
      </div>
    );
  }

  const flags = flagsFor(listing);
  const area = effectiveAreaSqft(listing);
  const saved = isSaved(listing.listing_id);
  const psf = area > 0 && listing.price > 0 ? listing.price / area : null;

  return (
    <div className="page-enter mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/listings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to search
      </Link>

      <PropertyMedia
        seed={listing.listing_id}
        className="h-[300px] w-full rounded-3xl sm:h-[400px]"
      >
        <div className="absolute left-6 top-6 flex flex-wrap gap-2">
          <LiveChip live={listing.is_live} />
          {listing.is_verified && <VerifiedChip />}
        </div>
        <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-white drop-shadow sm:text-4xl">
              {titleCase(listing.apartment_name)}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-white/90">
              <MapPin className="size-4" /> {titleCase(listing.locality)}, Mumbai
            </p>
          </div>
          <button
            onClick={() => void toggle(listing)}
            className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-transform hover:scale-[1.03]"
          >
            <Heart className={cn("size-4", saved && "fill-destructive text-destructive")} />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </PropertyMedia>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-display text-4xl font-semibold">{formatINR(listing.price)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatINRFull(listing.price)}
                  {psf ? ` · ₹${formatNumber(psf)} per sqft` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {flags.bait && <BaitChip />}
                {flags.sqm && <SqmChip />}
                {flags.corrupt && <CorruptChip />}
              </div>
            </div>

            {flags.corrupt && (
              <ul className="mt-4 space-y-1 rounded-xl bg-destructive/8 p-4 text-sm text-destructive">
                {flags.reasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            )}
            {flags.bait && (
              <p className="mt-4 rounded-xl bg-warning/12 p-4 text-sm text-warning-foreground">
                This contact number appears on dozens of listings priced far below the local market.
                Treat the asking price as an enquiry hook, not a real offer.
              </p>
            )}
            {flags.sqm && (
              <p className="mt-4 rounded-xl bg-primary/8 p-4 text-sm text-foreground">
                Source area is recorded as {formatNumber(listing.carpet_area)} — labelled sqft but
                almost certainly square metres. Converted: {formatNumber(area)} sqft (×{SQM_TO_SQFT}
                ).
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
              <Fact
                icon={<BedDouble className="size-4" />}
                label="Bedrooms"
                value={`${listing.bedroom} BHK`}
              />
              <Fact
                icon={<Bath className="size-4" />}
                label="Bathrooms"
                value={String(listing.bathroom)}
              />
              <Fact
                icon={<Maximize className="size-4" />}
                label="Carpet area"
                value={`${formatNumber(area)} sqft`}
              />
              <Fact
                icon={<Layers className="size-4" />}
                label="Floor"
                value={
                  listing.floor !== undefined && listing.total_floors !== undefined
                    ? `${listing.floor} of ${listing.total_floors}`
                    : "—"
                }
              />
              <Fact
                icon={<Maximize className="size-4" />}
                label="Super built-up"
                value={
                  listing.super_built_up_area
                    ? `${formatNumber(listing.super_built_up_area)} sqft`
                    : "—"
                }
              />
              <Fact
                icon={<Compass className="size-4" />}
                label="Facing"
                value={titleCase(listing.facing_direction)}
              />
              <Fact
                icon={<Car className="size-4" />}
                label="Parking"
                value={listing.covered_parking ? `${listing.covered_parking} covered` : "None"}
              />
              <Fact
                icon={<Building2 className="size-4" />}
                label="Balconies"
                value={listing.balcony !== undefined ? String(listing.balcony) : "—"}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Chip>{titleCase(listing.property_type)}</Chip>
              <Chip>{titleCase(listing.furnishing)}</Chip>
              {listing.website && <Chip>Source: {listing.website}</Chip>}
              <Chip>Listed {formatDate(listing.posted_at)}</Chip>
              {listing.project_id && (
                <Link to="/projects/$id" params={{ id: listing.project_id }}>
                  <Chip tone="primary">
                    <Building2 className="size-3.5" /> Project {listing.project_id}
                  </Chip>
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">About this home</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {listing.description ?? "No description provided by the source portal."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Location</h2>
            <MapPlaceholder
              lat={listing.latitude}
              lng={listing.longitude}
              label={titleCase(listing.locality)}
            />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Listed by</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-secondary">
                <User className="size-5 text-muted-foreground" />
              </span>
              <div>
                <p className="font-semibold">{listing.posted_by_name ?? "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{titleCase(listing.posted_by)}</p>
              </div>
            </div>
            <a
              href={`tel:${listing.posted_by_contact ?? ""}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Phone className="size-4" /> {formatPhone(listing.posted_by_contact)}
            </a>
            {flags.bait && (
              <p className="mt-3 text-xs text-warning-foreground">
                Flagged contact — verify before sharing personal details.
              </p>
            )}
            <Button variant="outline" className="mt-3 w-full" onClick={() => void toggle(listing)}>
              <Heart className={cn("size-4", saved && "fill-destructive text-destructive")} />
              {saved ? "Remove from shortlist" : "Add to shortlist"}
            </Button>
            {listing.listing_url && (
              <a
                href={listing.listing_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                View on source portal
              </a>
            )}
          </div>
        </aside>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold">Similar homes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Same locality and configuration, within ±15% of this price.
        </p>
        {similar.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No comparable homes found nearby right now.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s, i) => (
              <PropertyCard key={s.listing_id} listing={s} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

export function MapPlaceholder({
  lat,
  lng,
  label,
}: {
  lat?: number | undefined;
  lng?: number | undefined;
  label: string;
}) {
  const suspicious = lat !== undefined && lng !== undefined && (lat > 40 || lng < 40);
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border">
      <div
        className="relative h-56 w-full"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.94 0.02 150), oklch(0.9 0.03 130)), repeating-linear-gradient(0deg, rgba(0,0,0,.06) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 1px, transparent 1px 26px)",
          backgroundBlendMode: "normal",
        }}
      >
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow">
              <MapPin className="size-5" />
            </span>
            <p className="mt-2 rounded-full bg-card/90 px-3 py-1 text-xs font-medium">{label}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card px-4 py-3 text-xs text-muted-foreground">
        <span>
          {lat !== undefined && lng !== undefined
            ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : "No coordinates"}
        </span>
        {suspicious && <span className="text-destructive">Coordinates look swapped</span>}
      </div>
    </div>
  );
}
