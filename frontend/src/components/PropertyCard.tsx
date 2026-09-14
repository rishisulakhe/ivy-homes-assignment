import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, Building2, Heart, MapPin, Maximize } from "lucide-react";
import { PropertyMedia } from "@/components/PropertyMedia";
import { BaitChip, Chip, CorruptChip, LiveChip } from "@/components/Chips";
import { formatINR, formatNumber, relativeDate, titleCase } from "@/lib/format";
import { effectiveAreaSqft, flagsFor } from "@/lib/quality";
import { useSaved } from "@/lib/saved";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PropertyCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(listing.listing_id);
  const flags = flagsFor(listing);
  const area = effectiveAreaSqft(listing);

  return (
    <article
      className="stagger-in card-lift group overflow-hidden rounded-2xl border border-border bg-card"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      <div className="relative">
        <Link
          to="/listings/$id"
          params={{ id: listing.listing_id }}
          aria-label={listing.apartment_name}
        >
          <PropertyMedia seed={listing.listing_id} className="h-48 w-full">
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <LiveChip live={listing.is_live} />
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <p className="font-display text-2xl font-semibold text-white drop-shadow">
                {formatINR(listing.price)}
              </p>
              <p className="text-xs font-medium text-white/85">
                {area > 0 ? `₹${formatNumber(listing.price / area)} / sqft` : "—"}
              </p>
            </div>
          </PropertyMedia>
        </Link>

        <button
          onClick={() => void toggle(listing)}
          aria-label={saved ? "Remove from saved" : "Save property"}
          aria-pressed={saved}
          className="absolute right-3.5 top-3.5 grid size-9 place-items-center rounded-full bg-card/90 text-foreground shadow-sm transition-transform hover:scale-110 active:scale-95"
        >
          <Heart
            className={cn(
              "size-4.5 transition-colors",
              saved && "fill-destructive text-destructive",
            )}
            strokeWidth={1.9}
          />
        </button>
      </div>

      <div className="p-5">
        <Link to="/listings/$id" params={{ id: listing.listing_id }} className="block">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {titleCase(listing.apartment_name)}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" strokeWidth={1.8} />
            {titleCase(listing.locality)}
          </p>
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="size-4" strokeWidth={1.8} />
            {listing.bedroom} BHK
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bath className="size-4" strokeWidth={1.8} />
            {listing.bathroom} bath
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Maximize className="size-4" strokeWidth={1.8} />
            {formatNumber(area)} sqft
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip>{titleCase(listing.furnishing)}</Chip>
          <Chip>{titleCase(listing.property_type)}</Chip>
          {listing.project_id && (
            <Chip tone="primary">
              <Building2 className="size-3.5" strokeWidth={2} />
              {listing.project_id}
            </Chip>
          )}
          {flags.bait && <BaitChip compact />}
          {flags.corrupt && <CorruptChip compact />}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Posted {relativeDate(listing.posted_at)}
          {listing.website ? ` · ${listing.website}` : ""}
        </p>
      </div>
    </article>
  );
}
