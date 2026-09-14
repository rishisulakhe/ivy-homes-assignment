import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Compass,
  Layers,
  MapPin,
  Maximize,
  Phone,
  User,
  Wallet,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { PropertyMedia } from "@/components/PropertyMedia";
import { RentalCard } from "@/components/RentalCard";
import { Chip, LiveChip } from "@/components/Chips";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRental, fetchRentals } from "@/lib/data";
import { ApiError } from "@/lib/api";
import {
  formatDate,
  formatINR,
  formatINRFull,
  formatNumber,
  formatPhone,
  titleCase,
} from "@/lib/format";
import type { Rental } from "@/lib/types";
import { MapPlaceholder } from "./listings.$id";

export const Route = createFileRoute("/rentals/$id")({
  head: () => ({
    meta: [
      { title: "Rental detail — Ivy Homes Mumbai" },
      {
        name: "description",
        content: "Rent, deposit, furnishing and seller details for this Mumbai rental home.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <RentalDetail />
    </RequireAuth>
  ),
});

function RentalDetail() {
  const { id } = Route.useParams();
  const [rental, setRental] = useState<Rental | null>(null);
  const [similar, setSimilar] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    setSimilar([]);
    fetchRental(id)
      .then((r) => {
        if (cancelled) return;
        setRental(r);
        // Similar: same locality and bedrooms, rent within ±30%.
        return fetchRentals(0, { locality: r.locality, bhk: r.bedroom }, 50).then((page) => {
          if (cancelled) return;
          const lo = r.price * 0.7;
          const hi = r.price * 1.3;
          setSimilar(
            page.results
              .filter((s) => s.listing_id !== r.listing_id && s.price >= lo && s.price <= hi)
              .slice(0, 6),
          );
        });
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e instanceof Error ? e.message : "Could not load this rental.");
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

  if (notFound || (!rental && !error)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          title="This rental no longer exists"
          description={`We couldn't find rental ${id}. It may have been let and removed.`}
          action={
            <Button asChild>
              <Link to="/rentals">Back to rentals</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="Something went wrong" description={error ?? undefined} />
      </div>
    );
  }

  const psf = rental.carpet_area > 0 ? rental.price / rental.carpet_area : null;
  const monthly = rental.price + (rental.maintenance ?? 0);

  return (
    <div className="page-enter mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/rentals"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to rentals
      </Link>

      <PropertyMedia seed={rental.listing_id} className="h-[300px] w-full rounded-3xl sm:h-[400px]">
        <div className="absolute left-6 top-6 flex flex-wrap gap-2">
          <LiveChip live={rental.is_live} />
          {rental.website && <Chip tone="brass">{rental.website}</Chip>}
        </div>
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="font-display text-3xl font-semibold text-white drop-shadow sm:text-4xl">
            {rental.title ?? titleCase(rental.apartment_name)}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-white/90">
            <MapPin className="size-4" /> {titleCase(rental.locality)}, Mumbai
          </p>
        </div>
      </PropertyMedia>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="font-display text-4xl font-semibold">
              {formatINRFull(rental.price)}
              <span className="ml-2 text-base font-medium text-muted-foreground">/ month</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Deposit {formatINRFull(rental.deposit)}
              {rental.maintenance ? ` · Maintenance ${formatINRFull(rental.maintenance)}/mo` : ""}
              {psf ? ` · ₹${formatNumber(psf)} /sqft/mo` : ""}
            </p>
            {rental.maintenance ? (
              <p className="mt-4 rounded-xl bg-secondary p-4 text-sm">
                Effective monthly outgo: <strong>{formatINRFull(monthly)}</strong> (rent +
                maintenance), plus a one-time refundable deposit of {formatINRFull(rental.deposit)}.
              </p>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
              <Fact
                icon={<BedDouble className="size-4" />}
                label="Bedrooms"
                value={`${rental.bedroom} BHK`}
              />
              <Fact
                icon={<Bath className="size-4" />}
                label="Bathrooms"
                value={rental.bathroom !== undefined ? String(rental.bathroom) : "—"}
              />
              <Fact
                icon={<Maximize className="size-4" />}
                label="Carpet area"
                value={`${formatNumber(rental.carpet_area)} sqft`}
              />
              <Fact
                icon={<Layers className="size-4" />}
                label="Floor"
                value={
                  rental.floor !== undefined && rental.total_floors !== undefined
                    ? `${rental.floor} of ${rental.total_floors}`
                    : "—"
                }
              />
              <Fact
                icon={<Compass className="size-4" />}
                label="Facing"
                value={titleCase(rental.facing_direction)}
              />
              <Fact
                icon={<Building2 className="size-4" />}
                label="Type"
                value={titleCase(rental.property_type)}
              />
              <Fact
                icon={<Wallet className="size-4" />}
                label="Furnishing"
                value={titleCase(rental.furnishing)}
              />
              <Fact
                icon={<CalendarDays className="size-4" />}
                label="Available since"
                value={formatDate(rental.posted_at)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">About this home</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {rental.description ?? "No description provided by the source portal."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Location</h2>
            <MapPlaceholder
              lat={rental.latitude}
              lng={rental.longitude}
              label={titleCase(rental.locality)}
            />
          </div>
        </div>

        <aside>
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-6 shadow-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Listed by</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-secondary">
                <User className="size-5 text-muted-foreground" />
              </span>
              <div>
                <p className="font-semibold">{rental.posted_by_name ?? "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{titleCase(rental.posted_by)}</p>
              </div>
            </div>
            <a
              href={`tel:${rental.posted_by_contact ?? ""}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Phone className="size-4" /> {formatPhone(rental.posted_by_contact)}
            </a>
            {rental.listing_url && (
              <a
                href={rental.listing_url}
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
        <h2 className="font-display text-2xl font-semibold">Similar rentals</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Same locality and configuration, within ±30% of this rent.
        </p>
        {similar.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No comparable rentals found nearby right now.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s, i) => (
              <RentalCard key={s.listing_id} rental={s} index={i} />
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
